(() => {
  "use strict";

  const { after } = vendetta.patcher;
  const { find, findByProps } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;

  const KEY = "__itsTripleSixHiddenChannelsRuntime";
  const SHOW = 4;
  const COLLAPSED = 3;

  try { globalThis[KEY]?.cleanup?.(); } catch {}

  const rt = {
    active: true,
    patches: [],
    patched: {},
    originals: new Map(),
    categories: new Set(),
    guildLists: new Set(),
    channelStore: null,
    permissionStore: null,
    realCan: null,
    viewChannel: null,
    cleanup: null,
  };
  globalThis[KEY] = rt;

  const safePatch = (flag, make) => {
    if (rt.patched[flag]) return true;
    try {
      const unpatch = make();
      if (typeof unpatch !== "function") return false;
      rt.patches.push(unpatch);
      rt.patched[flag] = true;
      return true;
    } catch {
      return false;
    }
  };

  const channelStore = () => rt.channelStore ??= (
    findByProps("getMutableGuildChannelsForGuild", "getChannel")
    ?? findByProps("getChannel", "getDMFromUserId")
    ?? findByProps("getChannel")
  );

  function unwrapChannel(value) {
    if (!value) return null;
    if (typeof value !== "object") return value;
    return value.channel ?? value.record ?? value;
  }

  function resolveChannel(value) {
    const unwrapped = unwrapChannel(value);
    if (!unwrapped) return null;

    const id = typeof unwrapped === "string" ? unwrapped : unwrapped?.id;
    if (id != null) {
      try {
        const stored = channelStore()?.getChannel?.(id);
        if (stored) return stored;
      } catch {}
    }

    return typeof unwrapped === "object" ? unwrapped : null;
  }

  const guildId = channel => {
    try {
      return channel?.guild_id ?? channel?.guildId ?? channel?.getGuildId?.() ?? null;
    } catch {
      return channel?.guild_id ?? channel?.guildId ?? null;
    }
  };

  const isGuildChannel = channel => (
    !!channel
    && typeof channel.type === "number"
    && guildId(channel) != null
  );

  const isObfuscated = channel => {
    try { return channel?.isObfuscated?.() === true; }
    catch { return false; }
  };

  function lacksView(channel) {
    if (!isGuildChannel(channel)) return false;

    if (!rt.permissionStore) {
      rt.permissionStore = findByProps("getChannelPermissions", "can");
      if (rt.permissionStore?.can) {
        rt.realCan = rt.permissionStore.can.bind(rt.permissionStore);
      }
    }

    if (rt.viewChannel == null) {
      const constants = findByProps("Permissions", "ChannelTypes") ?? findByProps("Permissions");
      rt.viewChannel = vendetta.metro.common?.constants?.Permissions?.VIEW_CHANNEL
        ?? constants?.Permissions?.VIEW_CHANNEL
        ?? null;
    }

    if (!rt.realCan || rt.viewChannel == null) return false;
    try { return rt.realCan(rt.viewChannel, channel) === false; }
    catch { return false; }
  }

  const isHidden = value => {
    const channel = resolveChannel(value);
    return isGuildChannel(channel) && (isObfuscated(channel) || lacksView(channel));
  };

  const isPlaceholder = value => (
    typeof value === "string"
    && /^(?:\s*no[\s_-]*access\s*|_+hidden_+)$/i.test(value.trim())
  );

  const rawName = value => {
    const name = resolveChannel(value)?.name;
    if (typeof name !== "string") return null;
    const trimmed = name.trim();
    if (!trimmed || isPlaceholder(trimmed)) return null;
    return trimmed;
  };

  function replacePlaceholder(node, name) {
    if (isPlaceholder(node)) return name;

    if (Array.isArray(node)) {
      let changed = false;
      const next = node.map(child => {
        const value = replacePlaceholder(child, name);
        changed ||= value !== child;
        return value;
      });
      return changed ? next : node;
    }

    if (!React.isValidElement(node)) return node;

    const props = node.props ?? {};
    const overrides = {};
    let changed = false;

    for (const key of ["accessibilityLabel", "label", "text", "title"]) {
      if (isPlaceholder(props[key])) {
        overrides[key] = name;
        changed = true;
      }
    }

    const children = props.children;
    const nextChildren = children === undefined
      ? children
      : replacePlaceholder(children, name);
    const childrenChanged = nextChildren !== children;
    changed ||= childrenChanged;

    if (!changed) return node;

    try {
      return childrenChanged
        ? React.cloneElement(node, overrides, nextChildren)
        : React.cloneElement(node, overrides);
    } catch {
      return node;
    }
  }

  function revealCategory(category) {
    if (!category?.channels || typeof category.channels !== "object") return false;

    const level = category.isCollapsed === true ? COLLAPSED : SHOW;
    let changed = false;

    for (const item of Object.values(category.channels)) {
      const channel = resolveChannel(item?.record ?? item?.channel ?? item);
      if (!isHidden(channel)) continue;

      if (!rt.originals.has(item)) {
        rt.originals.set(item, item.renderLevel);
      }

      if (item.renderLevel !== level) {
        item.renderLevel = level;
        changed = true;
      }
    }

    if (changed) {
      try { category.shownChannelIds = null; } catch {}
      rt.categories.add(category);
    }

    return changed;
  }

  function revealGuildList(list) {
    if (!list || typeof list !== "object") return list;

    const categories = [];
    if (list.noParentCategory) categories.push(list.noParentCategory);
    if (list.categories && typeof list.categories === "object") {
      categories.push(...Object.values(list.categories));
    }
    if (list.voiceChannelsCategory) categories.push(list.voiceChannelsCategory);

    let changed = false;
    for (const category of categories) {
      changed = revealCategory(category) || changed;
    }

    if (changed) {
      try {
        list.rows = null;
        list.sections = null;
        list.allChannelsById = null;
        list.firstVoiceChannel = undefined;
        if (typeof list.version === "number") list.version += 1;
      } catch {}
      rt.guildLists.add(list);
    }

    return list;
  }

  function patchChannelList() {
    if (rt.patched.channelList) return true;

    let module = null;
    try {
      module = find(value => (
        typeof value?.default === "function"
        && typeof value.default?.prototype?.getGuild === "function"
        && typeof value.default?.prototype?.getGuildChannelRowsOnly === "function"
      ));
    } catch {}

    const proto = module?.default?.prototype;
    if (!proto) return false;

    const a = safePatch(
      "channelListGuild",
      () => after("getGuild", proto, (_args, result) => (
        rt.active ? revealGuildList(result) : result
      )),
    );

    const b = safePatch(
      "channelListRows",
      () => after("getGuildChannelRowsOnly", proto, (_args, result) => (
        rt.active ? revealGuildList(result) : result
      )),
    );

    rt.patched.channelList = a || b;
    return rt.patched.channelList;
  }

  function getChannelItemTarget() {
    const module = findByProps("getChannelMode");
    if (!module) return null;
    if (typeof module.default === "function") return [module, "default"];
    if (typeof module.default?.type === "function") return [module.default, "type"];
    if (typeof module.default?.type?.render === "function") return [module.default.type, "render"];
    if (typeof module.default?.render === "function") return [module.default, "render"];
    return null;
  }

  function patchChannelRows() {
    if (rt.patched.channelRows) return true;

    const found = getChannelItemTarget();
    if (!found) return false;
    const [target, method] = found;

    return safePatch("channelRows", () => after(method, target, (args, result) => {
      if (!rt.active) return result;

      const passedChannel = unwrapChannel(args?.[0]?.channel);
      const channel = resolveChannel(passedChannel);
      if (!isHidden(channel)) return result;

      const name = rawName(channel);
      return name ? replacePlaceholder(result, name) : result;
    }));
  }

  function patchNameHelpers() {
    const module = findByProps("computeChannelName", "escapeChannelName");
    if (!module) return false;

    let changed = false;

    if (typeof module.computeChannelName === "function") {
      changed = safePatch(
        "computeChannelName",
        () => after("computeChannelName", module, (args, result) => {
          if (!rt.active || !isPlaceholder(result)) return result;
          const channel = resolveChannel(args?.[0]);
          if (!isHidden(channel)) return result;
          return rawName(channel) ?? result;
        }),
      ) || changed;
    }

    if (typeof module.default === "function") {
      changed = safePatch(
        "useChannelName",
        () => after("default", module, (args, result) => {
          if (!rt.active || !isPlaceholder(result)) return result;
          const channel = resolveChannel(args?.[0]);
          if (!isHidden(channel)) return result;
          return rawName(channel) ?? result;
        }),
      ) || changed;
    }

    return changed;
  }

  function inspectRawNames() {
    const guildStore = findByProps("getGuilds", "getGuild") ?? findByProps("getGuild");
    let hidden = 0;
    let named = 0;
    let unnamed = 0;
    const examples = [];

    try {
      const guilds = guildStore?.getGuilds?.() ?? {};
      for (const id of Object.keys(guilds)) {
        let channels;
        try {
          channels = channelStore()?.getMutableGuildChannelsForGuild?.(id);
        } catch {}

        if (!channels || typeof channels !== "object") continue;
        const values = channels instanceof Map
          ? [...channels.values()]
          : Object.values(channels);

        for (const channel of values) {
          if (!isHidden(channel)) continue;
          hidden += 1;

          const name = rawName(channel);
          if (name) {
            named += 1;
            if (examples.length < 8) examples.push(`#${name}`);
          } else {
            unnamed += 1;
          }
        }
      }
    } catch {}

    const message = [
      `Hidden/obfuscated loaded: ${hidden}`,
      `Raw names present: ${named}`,
      `Raw names missing: ${unnamed}`,
      examples.length ? `\nExamples:\n${examples.join("\n")}` : "",
      "",
      "Read-only check. No reconnect, gateway, socket, experiment, or cache changes.",
    ].filter(Boolean).join("\n");

    try { RN.Alert.alert("Hidden Channels", message); } catch {}
  }

  function install() {
    channelStore();
    return [patchChannelList(), patchChannelRows(), patchNameHelpers()];
  }

  function Settings() {
    return React.createElement(
      RN.ScrollView,
      { contentContainerStyle: { padding: 16, paddingBottom: 32 } },
      React.createElement(RN.Text, {
        style: {
          color: "#F2F3F5",
          fontSize: 20,
          fontWeight: "700",
          marginBottom: 8,
        },
      }, "Hidden Channels"),
      React.createElement(RN.Text, {
        style: {
          color: "#B5BAC1",
          fontSize: 14,
          lineHeight: 20,
          marginBottom: 16,
        },
      }, "Render-only build modeled after Aliucord's approach. Hidden rows use the canonical ChannelStore record for their real name, even when Discord passes a sanitized ___hidden___ row to the renderer. It does not touch the gateway, sockets, reconnect logic, experiments, or Discord's cache."),
      React.createElement(RN.Pressable, {
        onPress: inspectRawNames,
        style: {
          minHeight: 46,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#5865F2",
          paddingHorizontal: 14,
        },
      }, React.createElement(RN.Text, {
        style: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
      }, "Inspect raw hidden names")),
    );
  }

  function cleanup() {
    rt.active = false;

    while (rt.patches.length) {
      try { rt.patches.pop()?.(); } catch {}
    }

    for (const [item, level] of rt.originals) {
      try { item.renderLevel = level; } catch {}
    }
    for (const category of rt.categories) {
      try { category.shownChannelIds = null; } catch {}
    }
    for (const list of rt.guildLists) {
      try {
        list.rows = null;
        list.sections = null;
        list.allChannelsById = null;
        list.firstVoiceChannel = undefined;
        if (typeof list.version === "number") list.version += 1;
      } catch {}
    }

    rt.originals.clear();
    rt.categories.clear();
    rt.guildLists.clear();

    if (globalThis[KEY] === rt) {
      try { delete globalThis[KEY]; }
      catch { globalThis[KEY] = null; }
    }
  }

  rt.cleanup = cleanup;
  const early = install();

  return {
    onLoad() {
      rt.active = true;
      const current = install();
      if (![...early, ...current].some(Boolean)) {
        throw new Error("Discord channel-list modules were not found");
      }
    },
    onUnload: cleanup,
    settings: Settings,
  };
})();
