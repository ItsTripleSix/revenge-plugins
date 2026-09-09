(() => {
  "use strict";

  const { after, before } = vendetta.patcher;
  const { find, findByProps, findByName } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;
  const pluginStorage = vendetta.plugin.storage;
  let activeBuilderAppearance = null;
  // A selected complete theme supplies its own effects. Legacy user preferences
  // stay intact underneath, including when a native theme is selected or removed.
  const storage = new Proxy(pluginStorage, {
    get(target, key) {
      return activeBuilderAppearance && Object.prototype.hasOwnProperty.call(activeBuilderAppearance, key)
        ? activeBuilderAppearance[key] : Reflect.get(target, key, target);
    },
    set(target, key, value) { return Reflect.set(target, key, value, target); },
  });
  const findInReactTree = vendetta.utils?.findInReactTree;
  const showToast = vendetta.ui?.toasts?.showToast;
  const getAssetIDByName = vendetta.ui?.assets?.getAssetIDByName;
  const Animated = RN.Animated;
  const Easing = RN.Easing;

  const GuildFolderModule = (() => { try { return findByProps("GuildsBarGuildFolderBG"); } catch { return null; } })();
  const FolderStore = (() => { try { return findByProps("getGuildFolders", "getGuildFolderById"); } catch { return null; } })();
  const FolderActions = (() => { try { return findByProps("saveGuildFolders"); } catch { return null; } })();
  const ColorUtils = (() => { try { return findByProps("int2hex", "hex2int"); } catch { return null; } })();
  const MessageRowGenerator = (() => { try { return findByProps("generateMessageRowData"); } catch { return null; } })();
  const MessageStore = (() => { try { return findByProps("getMessage", "getMessages"); } catch { return null; } })();
  const MarkupParsers = (() => { try { return findByProps("parseMessageMarkup", "parseEmbedTitleMarkup"); } catch { return null; } })();
  const ColorPickerActionSheet = (() => { try { return findByProps("CUSTOM_COLOR_PICKER_KEY"); } catch { return null; } })();
  const ClipboardModule = (() => {
    try {
      return vendetta.metro.common?.clipboard
        ?? findByProps("setString", "getString", "hasString")
        ?? findByProps("setStringAsync", "getStringAsync")
        ?? null;
    } catch { return null; }
  })();
  const GuildStore = (() => { try { return findByProps("getGuilds", "getGuild") ?? findByProps("getGuild"); } catch { return null; } })();
  const SelectedGuildStore = (() => { try { return findByProps("getGuildId", "getLastSelectedGuildId"); } catch { return null; } })();
  const SelectedChannelStore = (() => { try { return findByProps("getChannelId", "getVoiceChannelId"); } catch { return null; } })();
  const ChannelStore = (() => {
    try {
      return findByProps("getChannel", "getMutableGuildChannelsForGuild")
        ?? findByProps("getChannel", "getDMFromUserId")
        ?? findByProps("getChannel");
    } catch { return null; }
  })();
  const BaseChannelItemModule = (() => {
    try {
      return findByProps("ChannelModes", "BaseChannelIcon")
        ?? findByName?.("BaseChannelItem", false)
        ?? findByName?.("BaseChannelItem")
        ?? null;
    } catch { return null; }
  })();
  const ChannelUnreadIndicatorModule = (() => {
    try {
      const named = findByName?.("ChannelIndicator", false) ?? findByName?.("ChannelIndicator");
      const found = find?.(value => {
        try {
          const component = value?.default;
          const source = typeof component === "function" ? String(component) : "";
          return component === named || (source.includes("resolvedUnreadSetting") && source.includes("unread") && source.includes("style"));
        } catch { return false; }
      });
      return found ?? (typeof named?.default === "function" ? named : null);
    } catch { return null; }
  })();
  const UseRowManagerModule = (() => {
    try {
      const named = findByName?.("useRowManager", false) ?? findByName?.("useRowManager");
      const found = find?.(value => {
        try {
          const component = value?.default;
          const source = typeof component === "function" ? String(component) : "";
          return component === named
            || value?.useRowManager === named
            || (source.includes("createRows") && source.includes("updateRows") && source.includes("scrollToMessageId"));
        } catch { return false; }
      });
      return found ?? (typeof named?.default === "function" ? named : null);
    } catch { return null; }
  })();
  const GuildBarWrapperModule = (() => { try { return findByProps("useGuildsBarAnimatedWrapperStyles", "renderUnreadIndicator"); } catch { return null; } })();
  const HomeIconModule = (() => { try { return findByProps("HomeIcon"); } catch { return null; } })();
  const ChatIconModule = (() => { try { return findByProps("ChatIcon"); } catch { return null; } })();
  const SearchIconModule = (() => { try { return findByProps("MagnifyingGlassIcon"); } catch { return null; } })();
  const ChannelSearchIconModule = (() => { try { return findByProps("ChannelListMagnifyingGlassIcon"); } catch { return null; } })();
  const BellIconModule = (() => { try { return findByProps("BellIcon"); } catch { return null; } })();
  const BellSlashIconModule = (() => { try { return findByProps("BellSlashIcon"); } catch { return null; } })();
  const BellZIconModule = (() => { try { return findByProps("BellZIcon"); } catch { return null; } })();
  const ChannelNotificationIconModule = (() => { try { return findByProps("ChannelNotificationIcon"); } catch { return null; } })();
  const ChatNotificationIconModule = (() => { try { return findByProps("ChatNotificationIcon"); } catch { return null; } })();
  const SettingsIconModule = (() => { try { return findByProps("SettingsIcon"); } catch { return null; } })();
  const FolderIconModule = (() => { try { return findByProps("FolderIcon"); } catch { return null; } })();
  const BaseIconImageModule = (() => { try { return findByProps("BaseIconImage"); } catch { return null; } })();
  const LegacyIconModule = (() => { try { return findByProps("IconSizes", "getIconSize", "getIconStyle"); } catch { return null; } })();
  const DesignIconButtonModule = (() => {
    try {
      const found = find?.(value => {
        try {
          const component = value?.IconButton;
          return !!component && (typeof component.render === "function" || typeof component.type === "function" || typeof component.type?.render === "function");
        } catch { return false; }
      });
      return found ?? findByProps("IconButton") ?? null;
    } catch { return null; }
  })();
  const GuildSearchContainerModule = (() => {
    try {
      const found = find?.(value => {
        try {
          const component = value?.default;
          const names = [component?.displayName, component?.name, component?.type?.displayName, component?.type?.name, component?.type?.render?.displayName, component?.type?.render?.name];
          return names.some(name => String(name ?? "").includes("ConnectedGuildSearchAndInviteInner"));
        } catch { return false; }
      });
      return found ?? findByName?.("ConnectedGuildSearchAndInviteInner", false) ?? findByName?.("ConnectedGuildSearchAndInviteInner") ?? null;
    } catch { return null; }
  })();
  const SearchButtonModule = (() => { try { return findByProps("SEARCH_BAR_HEIGHT", "SearchButtonContent"); } catch { return null; } })();
  const IconActionButtonModule = (() => { try { return findByProps("ICON_ACTION_BUTTON_SIZE"); } catch { return null; } })();
  const LegacyHeaderIconModule = (() => { try { return findByProps("HeaderIcon", "ICON_SIZE"); } catch { return null; } })();
  const HeaderSharedModule = (() => { try { return findByProps("HeaderIconButton", "getDefaultStackHeaderProps"); } catch { return null; } })();
  const GuildBarGuildModule = (() => { try { return findByName?.("GuildsBarGuild", false); } catch { return null; } })();
  const toolkitIcon = (() => {
    try {
      return getAssetIDByName?.("FolderIcon")
        ?? getAssetIDByName?.("PaintPaletteIcon")
        ?? getAssetIDByName?.("ic_theme_24px");
    } catch { return undefined; }
  })();

  // BEGIN BUILTIN ICON PACKS
  const BUILTIN_ICON_PACKS = {"outline":{"folderClosed":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAADsOAAA7DgHMtqGDAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAA8JJREFUeJztnTtrFUEYhp+TqJCoaRQLrwjeEVvBCxFUEIzYKPgDhBiDIIK2sRdRvIv+AW0s1MZL4b2VCCqiECJaqSDGiNexmEg0uDuz2V2+zdn3gSXFzH47zMPOzJlz8k3DOYewo8W6AXVHAoyRAGMkwBgJMEYCjJEAYyTAGAkwRgKMkQBjJhUQox3YBCwC5gJTc8b7CFwF7uWMMyFo5NiMWwn0AVuBtsJaNMoJYD/Q1LuF4xEwBTgGdAOthbfoX84CvTSxhKxD0EzgCrCuhLb8j56Rv00rIcsbMBm4CXSW15xELuLfuF8Gzy6VLKug49h0PsBu4BTQMHp+acS+ASuBx5Q/5odoujkhdg7oI9z5A8BDYGicbZkPbAnUab45wTkXuqY654ZdMl+dc93OuZaIWGlXwzl3JuU5f3NmpH6e51Xiiqm0LdAZ3QU2qHYSYibhJSllA8CFYt5FwA8rvfixPkQPcJoJPjHHCJidUvaI4peGtZIQMwlPSyn7VFRDxvBHAoxOvEn0AAuBwZLaMpbPwGvgFXALGM4TrIjNuLLIIiG0eiqLL8A14DDwdDwBqr4dnWU4sqAN2An04zcPp2QNUHUBUH0J4D8j7cMPSTOy3Jh3CFoPnM8ZI5YG/kNe2pxkzXrgOnCQyO8z8gpYPnKJUVYDd4EjwKFQ5YkwBE1UDuLfiFQkoFy6QhUkwBgJKJf+UAUJKJdZoQp5V0HPqMnPR1LoBJYmlM0J3ZxXwD38d7V15jzJAqaHbtYQZIwEGCMBxkiAMRJgjAQYIwHGSIAxEmCMBBgjAcZIgDESYIwEGCMBxkiAMRJgjAQYIwHGSIAxEmCMBBgjAcZIgDESYIwEGCMBxkiAMRJgjAQYIwHGSIAxEmCMBBgjAcbECEhLwhf8H6ga0JFSFsynFCPgbUrZmsgYzUorvg+SeBMKENN5L1LKFgB7ImI0K3vx6TaTSOs7IC5xazvwjuQM6d+AA/h8Pk2XWjiBVnznH8WndP4fw/hc21/SAsVmzr2MzwyVxiDwgPLyyFWFDmAtMC9Q7xKwKxQsVsAy4AnVzjFXJX4Cq4jIIxc7gT4HzuVpUc04SWQSv6zp628AG8bXptpwH9iInxuDZFlCfgd2oOQcadwBthPZ+ZB9Df8ef2DPSfw4Jzw/8OcrbAY+ZLkxzyE+K/Bp7bvwS9U6Mow/8ekwfp7MTB4Bf2jDj3mL8cdYVTmtZBEM4VMXvwRuE1jnhyhCgMhBnfdxKoEEGCMBxkiAMRJgjAQYIwHGSIAxEmCMBBgjAcb8Blc5+M3wjrMRAAAAAElFTkSuQmCC","folderOpen":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAADsOAAA7DgHMtqGDAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAABTlJREFUeJztnU+IHTUcxz9vravbdvGgJ20tWhWsS/GiiLoUahH/tIKI6EkRhHVbKxVcr/Um1kNXu64Ui4joxYMiLgpqFSnqwcNqoQoFoVT0ZP2zrRVFNx6yj6fjm0wy+eVlJi8fGBYm7/2SX76b5JfMJK+jlCITj5HYBRh2sgCRyQJEJgsQmSxAZLIAkckCRCYLEJksQGSyAJHJAkRmlYCN1cA24ApgHbDG096vwDvAEU87raDjsRg3AewF7gTGxErU43lgD5D0amEdAUaB/cAUcI54if7Li8AuEhbBtQu6CHgLuDlAWfoxvfI3WRFcWsC5wAfAlnDFKeUQusUtR8g7KC5R0CxxKh/gYWAO6ETKPxi2LWAC+JLwfX4VyY0JtmPAXqor/wTwGXCmZlkuBW6r+Ex6Y4JSqupao5Q6q8r5Qyk1pZQasbBlujpKqXlDPv9mfuXzPvk14rL50I6KypgSLNDQiWAzCF9lSDsBvCTTFgHdrexC9/VVTAMv0PKB2UaAiw1pnyMfGg6VCDaD8FpD2mmpghToigC9gbeMaeAy4GSgsvwGfAd8C3wInJU0LrEYFwoXEaqiJyl+BxaAp4CvJQw2fTnapTsaBGPAvcBR9GLhqK/BpgsAzRMB9JxoN7pLutDHUBsEgJ4Ic7ELUmASeBs4r66BtggAWoTHaFZLALgJ2Ff3y20SAHotYTZ2QQrsBDbV+WKTo6AyFPA48CawA7ggcH7jwI3ABsNnVqHXy+5zNd5GAbocYXDPjUeAR9BPAssin+3o5+NO84S2dUGxWAbm0S2vjNXAVlfDWQA3DmKecV/pajAL4Mbf6GceZVziajAL4M6SIW3c1VgWIDJZgMhkASITch4wyWAmSoNmsiLtYOGe8V3XUALsA2YC2W4yV69cRWaAZ4EniwkhuqAtDGflVzFDn9YTQoAnAthMhe3FG9ICbATuELaZNNICPBrAZkq8X7whWVlrgYcE7aXGN8BHxZuSUdADmEPO99Cvd6TKDcBmQ/ocfd5nlRKgg+5+ylgC7se8jtJmOsAxQ/oS8Fq/BKku6Fb6x79dDpFu5YOH/1IC7DakKf4/O0yN2v5LCLARuN2QvgAcF8inqXj5LyFAVeh5QCCPJuPlv+8gPI75TYDj6LfHUqUq9K7031eAuzDvjH+OVLYS9acq9K7037cLMlV+aeiVCDahd6X/IZcNcuhp4X8oAXLoael/KAFy6GnpfygBcuhpSQgBcujp4H8IAWZJO/R8EHPo6eS/tABLwOvCNptEh97GwX44+y8tQA49Hf2XFCCHnjX8lxQgh541/JcUIIeeNZASIIeeNf2XEiCHnjX9lxAgh54e/ksI8DJph57bMIeeXv77CrBM844PkGaPIc3bfxsBTIfwfYI+RydVtmIOPd/F038bAX4wpF1uaaONrAdewXwal/eRCTaVZ5pcbEDvIE+NCeBjtAhlLAKHfTOyEeAw+qSoMvajo4QUWsJ64BngC/TM18TTEhnanpz7BvqkKBMngU8Jd45cSM5Hv1i7Gbt/pAX0/jdvbAW4BviK+EcXN4EfgWuB7yWM2XYbx2jeQUkxOI3eASRS+eB2fP0oer3DtE0zZX4G7kEPzmK4DJx/AnczJL/tUuAocB3ClQ/ukcsp9NT8APrkkNT5Bb299HoCTTh9fsRnE/qYru5JUSmxCLy6cv0UMiMfAbqMAbegDytah/mo4ybyF3pwPYPuahYZ4F42CQEyHqQwe201WYDIZAEikwWITBYgMlmAyGQBIpMFiEwWIDJZgMhkASLzD1lhZ39JNNZSAAAAAElFTkSuQmCC","home":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAADsOAAA7DgHMtqGDAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAA9BJREFUeJztnbtrFEEYwH9JNGhiYqONz0atAtZqgviKhYoIgp2likVAMLH00QgJoiAEgv+BFhaJhU+Q08RSBEVEIShWoviIEYNnLIYDCbmd2Z3d+e5mv1+7M7Oz329uZ3a/u7mW+fl5FDlapTtQdlSAMCpAGBUgjAoQRgUIowKEUQHCqABhVIAwKkAYFSCMChBGBQijAoRZkkMbHcBeYBOwDujMoc1G5ifwAXgHPABmfRrzEdADnAcOAMt9OtHE/AImgAvAqywNtGTIiLUDV4GTQFuWk0ZIFRgFzgJzaSqmFbAKuA30pqlUIirAEeCza4U0ApYC94Gd6ftVKp4Ce4DfLoXTrIKuocF3YQcw7FrY9RPQAzxH7/muVIGtwEtbQVcBt4CjljLTwCQw49JgE9MFbAc2WsrdBI7ZGnMR0Al8ov5Scw4YAG4Af22NRUIrcAqzGmyvU2YWWI3lOcFlDthN8jp/ABijPMEHc62jwJmEMh2Y2CXiImBLwrFpzMgvK2PA+4Tjm20NuAhYk3BsinKN/IVUMfNePdbaGnARsCLh2A+H+rHzPeFYl62yvg0VRgUIowKEUQHCqABhVIAwKkCYPHLCrvQBh4CVAc+ZhW/AOCa5UjihBAwDg4HOlQeDwAgwVPSJQtyC+miu4NcYxPS9UEIIOBjgHEVReN91EhYmhICJAOcoisL7HkJABTOhNRsjBFgJhVoFDWGWdroMXUDI54AKgS6qmdBJWBgVIIwKEEYFCKMChFEBwqgAYWLMBwR9kPIl1nxAsPf5vsScDwjyPt+X2PMBDZ+L0ElYmNjzAQ2fi4g5HxDkfb4vMeYDdBlaB80HLIJOwsKoAGFUgDAqwJ/uhGPW39CpAD/aML+ar8dHWwMqwI/TwIaE429sDYRchsZEGyb4VxLKzAKPbA01koBtmH121kt3xEI3ZksaWz/HMVuaJdIIAnqBS8Au6Y7kSBVzTVYk54B+zO5SFeIKPsB1HDfxk/gExDji/+cJcM61cMhPQMwjvsZj4DApdk4MIaAW+Lskr5mbmT+YPfX2AV/SVCzyFtSP2dg11qCDWWqOYzZufZ2lgSIE+Ab+GfAiv+7kzgxm6+K3wEMclppJ5CnAd3KdAi5jRlRpyEOABt4DXwHHgRMZ604CF4F7nn1oanwFLMtQp9QjfiEhH8R0xC9CCAE64hMoUoAG3oEiBGjgU+Ai4KtjW3qPz4DLuyDb9ysngf2YJIUGPyUuAup9t1MDnwNp/sKk9hMjgDuYV6+KJ1n+RUnJEf1aijAqQBgVIIwKEEYFCKMChFEBwvwDIqmxeUcMcmcAAAAASUVORK5CYII=","notification":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAADsOAAA7DgHMtqGDAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAABKVJREFUeJztnUuIFEcYgL9dNdlo0Lg7PkAPkmBUPHrJxUQ8Bt8rria55CTiBk8GPOUiROIlJEpEwYPGJyiIijcVvajgzYA5xaNuxhBNVIxKeahdCINd007XX3/1zP/BsstWb//V9XW9Z7v7nHMYevRrZ6DXMQHKmABlJmtnoALLgdXjP58HrivmpWP6atoJ/wDsbPndXuBbhbxUoo4ClgPXCtI+pWY1oY59wKoO07KkjgI+6DAtS+oooKswAcqYAGXqJKAfWALMDxwzD1hMja4r92Ho+8AGYC3wGTBU8u8eAleBc8BZ4IlE5mKQq4AP8ZOqL/ESqvAv8Ct+8vZHxXNFJzcBQ8D3wNfEXyZ5CRwGdgF/RT53x+QkYDOwj/LNTKc0ge3AaeE4pcihsxoADgInkC98gAZwCjgAvJsgXhDtGjAd31GuUIp/BVgHPFaKrypgOnAZWPaWf/cUuAvcAx6N/24GsAA/BJ36lue7DaxESYKWgAHgEuXv/DHgOHAGuAm8KDhuCvAJMAx8Acwqef7LwOfA85LHx8M5p/F1yJXjgXNuu3NuoIMY7znnvnHOjZWM9YtGWWgU/paSBXLEOTczQrxB59yxkjE3pS6P1E3QEPA74dHOK2AUP0qJySjwIzApcMyf+H4k2Twh9TB0D+0LfwvxCx/8HOOr8RhFzAJ2C8QuJGUN+Ag/egnNcLchU/j/ZxT4OZD+AvgYP8oSJ2UN2Em48I8iX/jga8KJQPoUEm7up6oB04D7FC+sPQQWjX9PwSC+NhYNU58Ac/ELeaKkqgHDhFc1vyNd4YPvZENt/TT8Erg4qQSELmYMv0qZmkP4UU8RXSOgH/95nSKOAc8S5KOVZ4T7gpUkKJ8UAhbhVyCLOJsgD53EHgIWSmcghYDFgbSnwK0EeSjiBuHaF8p7FFIICN1Fd4H/EuShiOf4mXkRXVEDZgbSctijDeVhUDp4CgGh4ec/CeK3I7QPUPUDAW1JIeCdQJpm8zNBaA9AfMsyhz3hnsYEKGMClDEBypgAZUyAMiZAGROgjAlQxgQoYwKUMQHKmABlTIAyJkAZE6CMCVAmhYC+BDGkEM+7tIAGsEY4hiTrgdmSAaQF7APmBNL/Fo5fhlAeGsBPksElBQwDI22OuSgYvyzt8jCCvxYRpD6e3gDuEL77T+L/GyYHThK+WZrAUvwHiaMiVQP2Ey78JrBDKHYnjAIPAuliTZGEgLXApjbHbEPgbqpAE9ja5pgRYGPswLGboLo1Pa0kb4pi14C6NT2tJG+KYgqoY9PTSvKmKFYT1AB+IzxpeYyv4nVgM/5hIkWM4ZuiZtVAsQS0azu7kVN4UZWIISD0LOdup/KzqmP0AbV7XnNEKl+7LUcrE0PAhQjnqCuVrz2GgOv4lyf0GnuJ8K6CmDPhiVeKzIh1wkx5RMRXpmg/NbHnsU5YGROgjAlQxgQoYwKUMQHKmABlcn6XZKyJXdSJU2xynYi96V2RVcnyXZM5CpDcX8juXZM59gGS+wvZ7V3kKKCnyFGA5P5CdnsXOQqQ2l+Isn4fmxw74QlsGGrIk2MT1FOYAGVMgDImQBkToIwJUMYEKPMaqatP84EivPAAAAAASUVORK5CYII=","notificationMuted":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAADsOAAA7DgHMtqGDAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAABStJREFUeJztnUuIHEUcxn8TVolRdA1rjDkp6EnFKIin5CReNIooPiABQUUGRXLRo4jHzcFXdFGDTzTx4kXBo+Be9CDkYgIKHgyCmoC7KmaRxM9Dz5iNyXRX99S/HtP1QbHLVnfVV/2jqrq6HjuQRFE8bYhtoO8qACKrAIisAiCyCoDIKgAiqwCIrLkW1+4Ado1+/xRY9m+nfxo4DsQWgWf+97dXgL1AGclNIRcAO4AvJ8QtAU9SIHSWSx9wV03cEHgNGPix0z+16QMmaTj6aV0T5oCbge3ANuAqYDOwMsr3V+B74DvgMLBm6MWbpm2C1suiOdoMPDAKtwGbHO/7i8rz58BHwAmPnvxKkkt4WW56XdLAMc26sFXSh5LWHPOt00lJ70u6xYMv78H1woGqh+uiaSFsknTUMa82Oi3pXUnbpvAWDUBICI875tFVf0h6tKM376HNSFhUbfySw7XTvB3d2OGeNroEOAB8MPo9qtp+iggB4ceW13fVbuALqo4+mlxHwufcR/Vwh00X0v7t6ErgKHD5hPjfgG+An6hePS8ELgWuBq4HtjjmM9Zh4A7geMv7/GiK9suyT7hV0pF19/8g6QVJNzSkM5B0k6TnJB1z9CZJX0va2OEZBO2EY3TM145CF29zkvbIHcTbUz6LKABCQJg2XCxpydHfI4G9eQGQAwQk7Zb0d4O3E5KuCOnLZ2I5QNil5tH1OyE9+U5wIOnVhgKO9ZakDSELOwp7GnydknRdKD8WieZQEw44+Aripes4oEmW4wQfmqcaa2ydEH+S6nP3qrURq0n5UJ8tumoFeL4m/iLgzhBGLFdFpA7hPeCXmvh7Q5iwXpYi4JDjtaEhrFFN1kzS7SG8hFgX1KYqh4bwSU3cPHCNtYEQAOZbXj8E3iSMt6+onzvebm0g1ZVxjwH7sa8Jp4AjNfEzUQO6KlRNOFYTd5lx3kkDgKomvIGtz7p3/ZkH8KfDNdbNUV0fsNEoz/8UG8BBqofbpJAdc1DFLpCAp3GDEKI5Cq4UCtNrCKkUpLcQUipELyGkVoDeQUjRfK8gpGq8NxBSNt0LCKkbnnkIOZidaQi5GB1DcJnebPvtaKVjnBflAgDs5pg/6xjnRTkBABsIy8C+8/x9HwFOA/CxTTW0xhCged2R6xbaZ6mOXwh+FEOOAOAMhNPAUw3XDoELgCeAf2quWybC+Re5NUHrNRNvRyEMWU6sW74dBZE1gAXgbuM8xs1RljNr1kb2U226myRf79n51gTDpdf3NSwBl6SdnvPMYWn8WcEq4QVJPzc8gINGeeewScQcwMcNBT8uaYthwbKBYJHoPQ6Fvj9A4bKA4DvBmE1PlhB8Jxi76ckOgs/EUml6soLga5PeAvAt9Qdl/I77bhkLDYCHcTuiJtjGQV8ADgEP+kgoIQWB4AOA66F+Ococgo9PEXXniuYu8z1ryXyUSlimEHwAMJ83TUBmEHwAmDSnOmsygeDzrIjx8fbm+6o8a5WqFj9EhLMtrA7ryFEDqiP5m+aYoTr2smmO2UmlEz6jKHPMBcDZCg6hADhXQSEUAOdXMAgFwGQFgVAA1MscQgHQLFMIKY8DfA3sVvGz2NbmIMJIM1RNYdFx9qqNFj34arPu6EWXNFOsAZbzCzsJWxMa80uxD7CcX/CRdptNIo35pQggB7WBUKsUAVjOL/hM2wVCY34pArCaX7DY8zWG8FLX/FLshMdK7TW0SZ3+3W/KAHqhFJugXqkAiKwCILIKgMgqACKrAIisAiCy/gVkX9ShGdoTSwAAAABJRU5ErkJggg==","notificationQuiet":"data:image/png;base64,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","search":"data:image/png;base64,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","settings":"data:image/png;base64,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"},"solid":{"folderClosed":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAADsOAAA7DgHMtqGDAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAtNJREFUeJzt3b+PDGEcx/H3okNxiUJiXSKuuErjT0AhErZTkPgLHNGo+RPUCKHQaBYhEYlCq9FQLeKQOAnZrI5dxUP8Ojff+bWf3ZnPK7ludvfJ895ndmb3MtOZTCaYzib1ANrOAcQcQMwBxBxAzAHEHEDMAcQcQMwBxBxArGyAReA08AB4AYyAScm/z8AtYE/Jsc2FTsEv47rABeAUsLnSEf2yBhwEntX0/DOhSIAecAPYVv1w/vEROECDI+TdBZ0BbjOdyQfYATwC9k3p9aYuzwrokSZf8cH9CTgEPBW8dq2iAbrAc6b3zl9PI3dH0XfzRbSTD2l39BjYLx5HpSIrYBEYUN/RTl6NWgmRFdBjdiYfGrYSIgEO1z6K/BZIJ39zf3QUCbBU+yiKacRKiATYWfsoilsAHjLHESIfwv7HoT99IB0APAGuA6/KPJkDlDMG+sBZ4HWRJ3CAanwBVoCreR/o3wOqsRW4DJzP+8AtgW06uYdjYV4BYg4g5gBiDiDmAGIOIOYAYpHzAJ8Jl7PheZRXgJgDiDmAmAOIOYCYA4g5gJgDiDmAmAOIOYCYA4g5gJgDiDmAmAOIOYCYA4g5gJgDiDmAmAOIOYCYA4g5gJgDiDmAmAOIOYCYA4g5gJgDiDmAmAOIOYBYJMCo9lE01zBrg0iAdxUMpK0y5y4SYFDBQNoqc+4iAe5VMJC2upu1QeSKWbuBl8zWtUPnwVfSPRBWN9oosgLeANcqGFDbXCFj8iF+8e5dpIt3by85qLYYAsvA+6wNo+cBb4HjwLcSg2qLMXCSwORDvhOx+8C5Hy9g6xuTLmF5J/qAIrcwOQrcxLujvw2BEwSOfH5X5KuIPrAXuET6pG+7MemeOsvknHwofheln7rAMeAI6ZCri/5GD3UbkY5uBqRzpD6Bo53/KRvASvK3oWIOIOYAYg4g5gBiDiDmAGIOIOYAYg4g5gBi3wGjuot5x6bmkgAAAABJRU5ErkJggg==","folderOpen":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAADsOAAA7DgHMtqGDAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAABHtJREFUeJztnc+LVXUUwD+j4YBEMKQLXajTbJpIXSSE6cYckTahtDCDaGEUooFo/4EbsdFRIZjBFrMQVIwoAossEWRcRMEUtSjxB2qkjqI4DUaj81p8eQy8eTP3fH/MO3O/93zgbWbuPd/vnM879753vvfeaavVahh6zNOeQNUxAcqYAGVMgDImQBkToIwJUMYEKGMClDEBypgAZUIErASOAr8B/wC1xK+HwCmgM/BvKhVtHs24dqAP+JDWVM4I0AP82oKx1JAKaAe+ATbM7nSmcA/YSMYSpO/kI7Q++QCLgB+AVQpjtwRJBawEhtE9YWdbCZKkvi/cbjZZBFwAXlGeR3Ikie2Z9VnI6AC+JbPDkeQQNAo824K5SHkAbAJ+1p5ICiQC5uKicTYStI/toXQA58jgnFBWAZCJhDILgAwklPUc0ErGgOvA98BnuB5YMkyAH0+BfmAv8F+KgCYgjPPAGySQUPZzgBavA4dSBLIKCOcpsBr4PSaIVUA484EdsUFMQBybYgPYISiOUeC5mAAmIJ62mJ3tEKSMCVDGBCgzGwJ+wS1jLsYdH3N/RfFMbIAGjgO7gPHEcbMl5aegE8C7cdOpHqkEPAZeAG5Hz6hipDoHDGLJDyJFBUwALwKXk8yoYqSogC+x5AeTQkCSvnhViRUwBFwq2KYD17RKfR9BGV8XG5MTK6BXsM1O5taVdZp80viDmJPwZdzJd2KGfduBa8ASyewy5w/gJRryFVMBhxuDNeEdLPl1DtIkX6EVMAIsx30Bm4lh3Lpp1bmNu+ft38ZfhFbApxQnfzOW/Dp9NEk+hFXAY9y7f6Rgv+9IsGaaAaPAMtzdn1MIqYBBipP/MnPnxg5t+pkm+eBfAdK2wyDwnmByuTMOdAE3p9vAtwIkbYelwHbPuLlyghmSD/4CJG2Hj4AFnnFzpIYgXz6HoCFgfcG2C4EbwPNFQSvA18CbRRv5VICk7bADS36dKW2HZkgrQNJ2mI/7ut0lGThzfgRelWworQBJ22Erlvw6B6QbSirgLrK2wyVgrXTgjPkT6Kb4DQvIKkDSdngNS36dQwiTD7IKWEzxN9/Pgbekg2bMHWAF0/R9miGpgKLkdwJbpANmzjE8kg9p1oT34T4BVZ0xYMB3p1gBHVjPp84AcN93p1gBtt7rGMc9yNCbGAELgN0R++fESVwLxpsYAbbeO0lf6I4xAvZE7JsTZ3Fr30GECrD13klETbfpCBWwL2bQjPgJ9zDBYEIE2HrvJAdjA4QI+JgE90ZlwFXgi9ggvgJsvXeSXtwDO6LwFbAbW+8F+Bt35Uc0PgIWAh+kGDQD9lPcohfhI2ALtt4L7hr/46mC+QjoTjVoibmB6wA8SRXQR8BfqQYtKVdwj/C/lTKoj4AzwKOUg5eI08Aa3EfPpPgIuA9sw13tWwXGga+AdcDbzHCBbQw+/0OmzhLccbCL/FbCxnAPBh/GXeXhvcDiS4gAIyH2vCBlTIAyJkAZE6CMCVDGBChjApQxAcqYAGVMgDImQBkToIwJUOZ/7n9TATFxk6sAAAAASUVORK5CYII=","home":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAADsOAAA7DgHMtqGDAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAvRJREFUeJzt3TtrFFEchvFnRcEbq42gYKFCAoIoItqbSkxn5bewjJUKCmIjfgm1EKxUELxgEZLOG1aCCsZLqWhEN8VajJEwe2Z2d2bOeZfM+2vEyawO/8czO7ObrJ1+v4/pbFAfQNs5gJgDiDmAmAOIOYCYA4g5gJgDiDmAmAOIbazx2C4wC8wAR4B9wE5gU/3DmmgrwDfgA/ACeALcB35U+cM6FV6MmwbmgLPA1ip/6Tr0C7gNXAPejvPAcQJsAS4D56i3ctazFeAGcAH4PcoDRg0wBdwFDlU+tHZZBM4AX4btOEqAo8BDYFf942qVJbLnyFdlOw0LMAXM4+FXtQQcB74W7VB2GboZuIOHX8de4B7Z82dQWYArZJeXVs8x4HzRF4tOQdPAG3y105SfZKfzgVNR0QqYw8Nv0nayS9MBoRXQJbt88k1Ws5aBPeTumEMrYBYPP4ZtwOn8xlCAmfjH0loDsw0F8JVPPIfzG0IB9ic4kLY6kN8QCtBNcCBttSO/IXQV5G8Wjauz9jd+R0zMAcQcQCzFyw2d4btMtKjPiV4BYg4g5gBiDiDmAGIOIOYAYinuA/zaUgmvADEHEHMAMQcQcwAxBxBzALE2vB8w0fchXgFiDiDmAGIOIOYAYg4g5gBifj8grT/5DV4BaX3Pb3CAtN7lNzhAWi/zGxwgrcf5Df4BjXSWgd1kP7T9n1dAOrfIDR+8AlLpAQfxk7DMdQLDB6+AFBaAkwRuwsABYvsMnAA+Fe3gU1A8H4FTlAwfHCCWBbJ/+a+H7egAzeoBV8nO+YWfE7eWP5SpGcvATbIPbg1e7RRxgPH1yD66+D3wHHgKPCBwkzWKSQowD1wCHomPI6lJCNDKwa9SBmj14FcpAnjwa6QM4MEHpAjgwZeIGcCDH0GMAB78GJoM4MFX0EQAD76GOgE8+AZUCeDBN2icAB58BKME8OAjKgvgwScQCvAMuPjvV4usyn9laA3ye8JiDiDmAGIOIOYAYg4g5gBifwHGG5acABbWhAAAAABJRU5ErkJggg==","notification":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAADsOAAA7DgHMtqGDAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAA09JREFUeJztnb9vTlEYxz8vDWrALLTSMPgVkSChBpMY2hCDGEhEDGwSQzdJ/QUqxGAisTCIzWiQSsQiwdhEwz9gKRKp4Rid9HXPeZ7vfe99PnNzvvc9nz7n2/e9N28Hq6urBDrWqS+g74QAMSFAzJj6AhqwVmkNXK6iEjEBYkKAmBAgJgSICQFiQoCYECAmBIgJAWJCgJgQIGYUPguaBM4Cp4BjQ/z8V+Ad8Bp4CXyxurAaDFp6Q2YjcAG4ARwvXGsReAg8B34WrlWdtgkYA64At4GdlddeBuaBx8Dvyms3pk0CDgGPgKPGOR+Aa8B745yhaEMJD4BbpA2x3nxIoheBmw5Za6KegA2kI+GiKP8pcBX4JcqXCtgMvABOqy7gL6+A88CKIlx1BK0n/fapNx/gDPAM0Z/kKgH3gXOi7H8xA9xTBCuOoMvAE+/QIblEmkw3vAVsBz4DWz1D/4PvwD7gm1eg9xH0gPZuPsAWYMEz0HMCpoE3XmGFnADeegR5TsAdx6xS5r2CvCZgL/CJ0Xpq7QDpmk3xmoDrjNbmQ/q8yByPCRiQPoncYR1UmWVgF2s/i1qExwQcZvQ2H2ACOGgd4iHgpEOGFdPWAR4CjjhkWDHMLdAiPATscciwYrd1gIeACYcMKyatAzwEbHPIsML82j0EbHTIsGLcOsDjfUBr7vo3xPQNZBtuyveaECAmBIgJAWJCgJgQICYEiAkBYkKAmBAgJgSICQFiQoCYECAmBIixFjBrvL4HM5aLW96QGQc+AlNWAU4sAfuBHxaLW07AHKO/+ZBew5zV4lYTMEV6sHWTxeICVkgP6y7VXthqAhbozuZDOk7vWixsIWAW4+ISYfK6ah9BXSneHNULufYEdKV4c1Qv5JoT0LXizVG1kGtOQNeKN0fVQq4loKvFm6Pa661xBHW9eHNUKeQaE9D14s1RpZBLJ6AvxZujuJBLJ6AvxZujuJBLBPSteHMU7UPTI6ivxZujcSE3nYC+Fm+OxoXcZAL6Xrw5GhVykwnoe/HmaFTI6q+t7D3xVISYECAmBIgJAWJCgJgQICYEiGnj/5CxfmPSqi8PjAkQEwLEhAAxIUBMCBATAsSEADFtfB/Qqr/TrYkJEBMCxIQAMX8AtfqV277U7wwAAAAASUVORK5CYII=","notificationMuted":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAADsOAAA7DgHMtqGDAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAABRZJREFUeJztnT+IHFUcxz+3iZhTLCIR1CJF8A82AUXSRCKohRivsZRUBrERQRHWzhE1JJ2RYGMlChaChZUoqKjIeY1NVESwsEhUxGsURRK/FrPD7e7t7fx5v/fmzdv3gWHZy+7b37zPfd+btzOZW5NEpj9GfRew6mQBPZMF9EydgAI4G6COlWX/kn8rgBennr/gt5TVZK8EFMx2/picBC8sElAw2/kVWYIH5gUULO78iizBmGkBBcs7vyJLMKQSUNCs8yuyBCNGtO/8iizBgBHwt8P7swRHRsA53I7xswQHqoXYOWCdbkMRlBL+oRzOfHMTcOfkcT9wPbAN/AZcAn4GBvMV7/RKuJg8dpVQva9Y9qIO3A48MtnuBW6sef02sAV8BbwHfG9cjy2S5rdCbhQL2nTZXOv5RtLTktaN6zLZfO10bBIk6bKk5yRda1ybFwFIGjvu8FnjYl3rqfhR0gnj2rwISDUJknRF0iuSRsb1mQtIOQmS9L6k64zrMxeQchIkaVPSDcb1mQtIPQmfSDpgXJ+5gNST8K5xbV4EpJ6EJ41r8yIg5ST8KekO49q8CEg5CR8a1+VNQMoSHjKuy5sAlOZwtGlck1cBqSbhbuOavApIUcIF43q8C0BpDUe/K8B3RT4aTSkJ9xjXsmvzcXV0bOeYXep5wLCOxXi06xJ/KY7hyPvXE14b1/CHI++Hoz4aPa/ZyWvIEn41/uwgAiTpbUnXdNzpRfQl4V/jzw0mQJI+1uyJjiFKuGL8mUEFSNLXkg613OllhJbwn/HnBRcgSd9JOtxip+sILWHwAiTpkqSjLXa6jpASkhAgSX9IOt5wp5sQSkIyAiTpL0knG+x0U0JISEqAVB5ZnK7Z6Tb4lpCcAKk8uhgv2em2+JSQpICK6VVzrBKSFiBJb2ln1Vx0eP80hWPt85t1e1EKkGZXzbElYSUESLOr5pWRENPtao4BnwOHie+kjjdiEgBwF7AJHGVFJMQmAOAW4DPgOCsgIUYBAAeBj4CTpC7Bw8RiyfSqOcmJedkds2JgH/AmcIgyCdD9t3k8eYzqzl/WAjaM2wNYo+z0W4FnJz9LRoKlgHXgNcP25nmG8n/JPzF5noQESwFj4Ihhe4s4BdwMPDZ5PngJa5LJfS2OAN8CBywaa8AW5RHSadyOcFyPsJyxSsB5wnU+7KyaH548H2wSLARsAI8atNOWatU8aAmuQ9A6cBH/Y/8ytil/Ce5jgMOR60o4xMRbR7VqvsgAV8wuCQg98dZxFXiKctE2mCS4JCD0xFtHtWqGASWhawI2gA+Ma7HkdeAX4IxDG0GS0EVADBNvE94BfgBedmjDu4QuQ1AME28TTgH3A686tOF9OGqbgNgm3iZsUS7anndow1sS2iYgtom3Cccov7Z4w6ENb0lok4DYJ946LgOfAo87tGGehKYChjLx1rENfInbeQtTCU2HoKFMvHUcBB4EvnBow3Q4apKAIU68dVwFfqK8LXJXTJLQJAFDnHjr2AfcRjkkdcUkCVYnZIaMa0c6JSHW64JC0ut1R1lASW8SsoAdepGQBcwSXEIWsJugErKAxQSTkAXsTRAJMV6c63thstbitd4vCM4JqMdrErKAZniTkAU0x4uELKAdrhJ2/d3OLKA9XSUUwEvzP8wCutFWQsGCzocswIWmEgr26HyIcx3Q5ji9b+rWCQVLOh9yAizYKwkFNZ0PWYAV8xIKGnQ+xDkEDZXqj2JDw84H+B9vhQnH+ck0ygAAAABJRU5ErkJggg==","notificationQuiet":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAADsOAAA7DgHMtqGDAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAA1BJREFUeJztnD1rVEEUhp81RvwIIqRRtAoBAwqWqbVWm2Algp2dgiApc/MP4s8QbK2trEQQ1CKNEMFfIJqAxbHYDYjJuJl7Z+ade+954Bb5YD7OkzPvZvfuTswMR8cp9QLGjgsQ4wLEnFYvoEJyh+Lk7y+8A8S4ADEuQIwLEOMCxLgAMS5AjAs4yiTi2o4cu/n3Gy6gPQ2wFfn7R4S5gHY0JCg+uIA2NCQqPvTnuaDLwB1gHVgDVoBlYAn4BezNrk/AW+AdsJ9hHQ1xxd9mXk6YWa3Xspk9NbP3Fs+Bmb0xs/tmtpBoPU3kGpqTjKsu8nHXNTPbMbOfkRsOsWdmz8xsscOashTfKhOwOCvUj8jNnpRdM3vQYl2xxd+KGV9d9MPrupl9jNxoW6r4yz+81IXHzDYs31/9cVRTfKtAwGMz+x250a7kKP7WCcetSsCTyE2moprimxkTM8l9QRvAK2BBMPdkzs+LviasELAKfAAulp54RlUCSj8VcQZ4ja741VFawHPgVuE5q6bkEXQV2AUulJowwGiPoBfoi18dpTpgGfgGnC8x2RxG2QEPqaP41VHq9YBHheZJwbwOSTtZgSPoCvCdwhv7D7WsAyhzBN2msk3XRAkB6wXm6C0lBKwVmKO3lBCwWmCO3lJCwKUCc/SWEgKWCszRW0o8DK3tjchVPSLzO+PEuAAxLkBMX+4NTUlsJmXNDO8AMS5AjAsQ4wLEuAAxLkCMCxDjAsS4ADEuQIwLEJNbwL3M45fgbs7Bc74gcw74zPRN1X3mK3ADOMgxeM4O2KT/xYfpHjZzDZ6rA1aAL8DZHIML2AduMu2GpOTqgJcMp/gwPU53cgycQ8A9MgeXiCz7Sn0EDSV4QyQP5NQdMJTgDZE8kFN2wNCCN0TSQE7ZAUML3hBJAzmVgKEGb4hk+01xBA09eEMkCeQUHTD04A2RJJC7dsBYgjdE50Du2gFjCd4QnQO5i4CxBW+ITnVoewSNNXhDtA7kth0w1uAN0TqQ23TA2IM3RKtAbtMBYw/eEK0CWfWZcc4MvytCjAsQ4wLEuAAxLkCMCxDjAsTU+D7hop9aqMY7QIwLEOMCxLgAMS5AjAsQ4wLE1Ph/QFWP03PjHSDGBYhxAWL+AD1HTF/qOrVyAAAAAElFTkSuQmCC","search":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAADsOAAA7DgHMtqGDAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAABvlJREFUeJztnWuIVkUYx3+7ltuCmnipzFW6SApRWRtGF5GkT16qD0mWWRClpUZWxGoEvhaFfktQuhAFmVgZ0U30QxlBEaWlCZFGkrmuxXrBUjJdd58+PLvs67r6nnlm5syrnR8cFpadmf+Z/5lzZp65bI2IUJCO2tQC/u8UBiSmMCAxhQGJKQxITGFAYgoDEnNOagHARcC1wNXAWOBy4Pyy67yyvz0ItALbgJ87r63Aj0BHfpLDUZNoIHYlMAWYCtwE1Hjmtw9YB3wCrAcOeeaXG3kaUA/MBJ4AxkQs5zDwOvAS8HvEcoKQhwH9gKeAucDQ2IWVcRxYAyxBX1NVSWwDpgLLgZExC6lAB9oingb+TqijV2IZcCnwJjAhRuZGmoHHgI9SCyknhgGTgbeAQaEzDsRrwDygLbUQCDsOqAVeQHsi1Vr5ALPQnlJVaAzVAvoAbwD3h8gsJ35FW+svKUWEMKAP+r6f6S8nd1qAW4CdqQT4GlADrAbuDiMnCduB8cDeFIX7fgOe5cyufIDR6Ci6f4rCfVrAZOBjwnzI24HvgC+A79Gncg86qgUdzF2MVlYjMBEYF6jsLt4mwWvUasAlwGZgoGf5zcAK9OZbHNM2APehI+wGTx1dTAfeDZRXNkTEcq0VP1pFZJaI9DWWX371FZFHRGSvpyYRkQMi0hBAU+bLkmia502uEpFBEW5msIis9tQmIrI+grZgBgwQkRbjjR0TkYdyuKnZnWX5MCkHnYiI80fsUfRj6Mo/wB1oUCw2rwJ3dpZpZQn+cxSZcPkI1wG/AcMcy2hDK3+dYzpfbgPWAn2N6W9HwypRcWkBD+Be+QBzyL/yAT4DHvdI/2QoIafDpQVsBa5yzH8V2lVMyTvYBosdaHe7OaiaHmRtAaNxr/z9wHzHNDGYg84Zu1KLjguiktWAaYa8n8F246E5ACwypp0RUkhvZH0FbUaXjGSlGRgFHLOIikAdGn62jJhHATvCyukmSwsYCFzjmO8KqqfyAY6imizcEFJIT7IY0Ihbn7gD/fhWGyvRoJ8r40ILKSeLAdc55vktsNugJTYtaKTVleQGuLz7QUPK1coGQ5qxRBwVZzHANfSwySIkJywtoJ6IkzVZDBjimGfSSe4KbDemc62DzGQxwHU54R8WITlh1TY4qIoyshjg2vwOV/6TZFhXTUdbQ5TFgH9jFX4GEa0OshjgGlfvZxGSE9aPabRFvTEMsISs88KqLakBrY55jrYIyQmrtr+CqigjiwHbHPNstAjJiesNaQ6iofUoxDBgokVITli0bQGi7WKJYcA4wi2UCslIbK1zc2gh5WQx4Bvcooi1pJ+G7I0Z2JYybgktpJysEzJfATc75Lsb3e9bLXMCdeikynDHdILOC+8KLaiLrE/Eesd8G4AHHdPE5GHcKx80tB6t8iG7AZ8a8n6eiDEUB4YCi41p14QU0htZDdgCbHTMewi6RTU1K7DFcgR4P7CWk3D5KFnmVKcDsw3pQjEX24oO0Ndu1NcPuC9N3AVc4FhGO3AX8KFjOl8md5ZpPZBkPNr5iIpLCzgKLDOU0QedpJ9kSGtlCvAe9sr/nBwqH3Benl4vIjuNS76PiW6kiL3ke66ItBk1djEhB52m5elHgCaj1+cCL6NrNWNM8Q1Fn/rl+J+DdKu/nIwYXKsRkQ2eT9g+EZkjInUBnqI6EZknIvs9NfWkFEBbxcuacLiE2ZO1W0QWiMgIg4YRIrKwM49YRDfBZ5vqJHSAFmLNTAe6nGUD3dtUWzhxm2oDcAUaUp6IBtbyOPNuMVCKlbnvTvkXgYWBtFQz0UwIcVTBK+gJJGc7S4EFoTMNcVhHLbrR+h5/OVVPcBNCvEM70P1jKwPkVe00EfhVFOoj1oaeFTSfM/T8TgcWodtYgxC6F7EMjftEW0XgwUHgXuyh6XLCtYRI/dthIvJB4D65D1+LyGXSra8pUL5LxLOuYo/0ZojIn4Fu1sIe0UNBauVkbaVAZXgN1mIbgGioYJbYz5iwcEj06exfQVvylpCHAV1XvWjMZlOgm+6NH0RjTAMddCVtCXkaUH6NEZHnRGSriLR73HS7iGwUfQIbPfQkMyHV6enlDEC3gt6IxnoagAs7fx6ne1XaYfR0wx2d10/Al+hG7BCUsG/oLscpbFENBlQTTYTp42ceMRf/QeNEQoUaMhtZGHAyuZpQGNA7uZlQGHBqcjGhMOD0RDehMKAyUU0oDMhGKBOO9PxFYUB2fE0o0UsovDDADasJJU4xD1EY4I6rCSVOMwlUGGAjqwklKszAFQbYqWRCiQzTn4UBfpzKhBIZ554LA/zpaUIJh4n/avh3tmcDS9GjzcBx1UUxH5CY4hWUmMKAxBQGJKYwIDGFAYkpDEhMYUBi/gNXbT/bd7CdEwAAAABJRU5ErkJggg==","settings":"data:image/png;base64,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"}};
  // END BUILTIN ICON PACKS

  const APPEARANCE_DEFAULTS = {
    folderColorSource: "theme",
    folderCoverMode: "theme",
    folderBackground: "",
    folderAccent: "",
    closedFolderBackgroundSource: "shared",
    closedFolderBackground: "",
    openFolderBackgroundSource: "shared",
    openFolderBackground: "",

    closedOutlineEnabled: true,
    closedOutlineColorMode: "theme",
    closedOutlineColor: "",
    closedGradient1: "",
    closedGradient2: "",
    closedGradient3: "",
    closedOutlinePattern: "theme",
    closedOutlineWidth: "theme",
    closedOutlineAnimation: "theme",
    closedOutlineSpeed: "theme",
    closedOutlineGlow: "theme",
    closedOutlineBrightness: "theme",
    closedOutlineTrail: "medium",

    openOutlineEnabled: true,
    openOutlineColorMode: "theme",
    openOutlineColor: "",
    openGradient1: "",
    openGradient2: "",
    openGradient3: "",
    openOutlinePattern: "theme",
    openOutlineWidth: "theme",
    openOutlineAnimation: "theme",
    openOutlineSpeed: "theme",
    openOutlineGlow: "theme",
    openOutlineBrightness: "theme",
    openOutlineTrail: "medium",

    mentionBackgroundSource: "theme",
    mentionBackground: "",
    mentionLineSource: "theme",
    mentionLine: "",
    mentionTextMode: "auto",
    mentionTextColor: "",

    mentionTagSource: "theme",
    mentionTagMode: "solid",
    mentionTagColor: "",
    mentionTagGradient1: "",
    mentionTagGradient2: "",
    mentionTagGradient3: "",

    uiAccentSource: "theme",
    smartAccentColor: "",
    selectedGuildAccent: "",
    reactionAccent: "",
    homeIconAccent: "",
    searchIconAccent: "",
    notificationIconAccent: "",
    settingsIconAccent: "",

    iconSource: "theme",
    iconPack: "outline",
    iconCustomPack: "",
    homeIconMode: "pack",
    homeIconImage: "",
    searchIconMode: "pack",
    searchIconImage: "",
    notificationIconMode: "pack",
    notificationIconImage: "",
    notificationMutedIconMode: "pack",
    notificationMutedIconImage: "",
    notificationQuietIconMode: "pack",
    notificationQuietIconImage: "",
    settingsIconMode: "pack",
    settingsIconImage: "",
    folderClosedIconMode: "pack",
    folderClosedIconImage: "",
    folderOpenIconMode: "pack",
    folderOpenIconImage: "",
  };

  const DEFAULTS = {
    ...APPEARANCE_DEFAULTS,
    toolkitProfiles: [],
  };
  const PROFILE_SETTING_KEYS = Object.freeze(Object.keys(APPEARANCE_DEFAULTS));
  const PROFILE_LIMIT = 20;
  const PROFILE_BACKUP_FORMAT = "theme-toolkit-profile-backup";
  const PROFILE_BACKUP_VERSION = 1;
  const PROFILE_BACKUP_TEXT_LIMIT = 1000000;
  const ICON_PACK_TEXT_LIMIT = 16000;
  const ICON_SLOTS = [
    { key: "home", label: "Home", accent: "homeIcon" },
    { key: "search", label: "Search", accent: "searchIcon" },
    { key: "notification", label: "Notifications", accent: "notificationIcon" },
    { key: "notificationMuted", label: "Muted notifications", accent: "notificationIcon" },
    { key: "notificationQuiet", label: "Quiet notifications", accent: "notificationIcon" },
    { key: "settings", label: "Settings", accent: "settingsIcon" },
    { key: "folderClosed", label: "Closed folder", folder: true },
    { key: "folderOpen", label: "Open folder", folder: true },
  ];
  const ICON_ALIASES = [
    ["home", HomeIconModule, "HomeIcon"], ["home", ChatIconModule, "ChatIcon"],
    ["search", SearchIconModule, "MagnifyingGlassIcon"],
    ["search", ChannelSearchIconModule, "ChannelListMagnifyingGlassIcon"], ["search", null, "SearchIcon"],
    ["notification", BellIconModule, "BellIcon"],
    ["notificationMuted", BellSlashIconModule, "BellSlashIcon"],
    ["notificationQuiet", BellZIconModule, "BellZIcon"],
    ["notification", null, "NotificationIcon"], ["notification", null, "NotificationsIcon"],
    ["settings", SettingsIconModule, "SettingsIcon"],
    ["folder", FolderIconModule, "FolderIcon"],
  ].map(([slot, module, name]) => {
    let assetId = null;
    try { assetId = getAssetIDByName?.(name) ?? null; } catch {}
    return { slot, module, name, assetId, original: module?.[name] };
  });

  // Retire the exact v0.6 visual-test palette once. Any changed value means the
  // user customized it, so the migration leaves the entire set untouched.
  try {
    const testAccents = {
      smartAccentColor: "#B026FF",
      selectedGuildAccent: "#FF00FF",
      reactionAccent: "#39FF14",
      homeIconAccent: "#00FFFF",
      searchIconAccent: "#FFEA00",
      settingsIconAccent: "#FF6600",
    };
    const exactTestPalette = storage.uiAccentSource === "toolkit"
      && Object.entries(testAccents).every(([key, value]) => colorValue(storage[key]) === value);
    if (storage.retiredV060AccentTestDefaults !== true && exactTestPalette) {
      storage.uiAccentSource = "theme";
      for (const key of Object.keys(testAccents)) storage[key] = "";
    }
    storage.retiredV060AccentTestDefaults = true;
  } catch {}

  // Retire the temporary solid-white mention test from the AMOLED profile.
  // Other profiles and non-white custom mention colors stay untouched.
  try {
    if (storage.retiredWhiteMentionTestV080 !== true) {
      const isWhiteMentionTest = values => values?.mentionColorSource === "toolkit"
        && stripAlpha(values?.mentionBackground) === "#FFFFFF";
      if (isWhiteMentionTest(storage)) {
        storage.mentionColorSource = "theme";
        storage.mentionBackground = "";
        storage.mentionLine = "";
        storage.mentionTextMode = "auto";
        storage.mentionTextColor = "";
      }
      if (Array.isArray(storage.toolkitProfiles)) {
        storage.toolkitProfiles = storage.toolkitProfiles.map(profile => {
          if (String(profile?.name ?? "").trim().toLowerCase() !== "amoled default" || !isWhiteMentionTest(profile?.values)) return profile;
          return {
            ...profile,
            values: {
              ...profile.values,
              mentionColorSource: "theme",
              mentionBackground: "",
              mentionLine: "",
              mentionTextMode: "auto",
              mentionTextColor: "",
            },
          };
        });
      }
      storage.retiredWhiteMentionTestV080 = true;
    }
  } catch {}

  // Split the old shared mention source and On/Off rows into independent
  // background and side-line sources. Discord is the native/no-override choice.
  try {
    if (storage.splitMentionEffectSourcesV1110 !== true) {
      const migrated = migrateMentionEffectSources(storage);
      storage.mentionBackgroundSource = migrated.mentionBackgroundSource;
      storage.mentionLineSource = migrated.mentionLineSource;
      if (Array.isArray(storage.toolkitProfiles)) {
        storage.toolkitProfiles = storage.toolkitProfiles.map(profile => {
          if (!profile?.values || typeof profile.values !== "object") return profile;
          return { ...profile, values: migrateMentionEffectSources(profile.values) };
        });
      }
      delete storage.mentionColorSource;
      delete storage.mentionBackgroundEnabled;
      delete storage.mentionLineEnabled;
      storage.splitMentionEffectSourcesV1110 = true;
    }
  } catch {}

  // Remove the retired per-server/DM palette experiment. If it was active,
  // restore the appearance saved before it was enabled, then discard its cache.
  try {
    if (storage.retiredContextAutoPalettesV116 !== true) {
      const base = storage.contextAutoPaletteBase;
      if (storage.contextAutoPaletteEnabled === true && base && typeof base === "object" && !Array.isArray(base)) {
        applyAppearanceValues(materializeAppearanceValues(base));
      }
      delete storage.contextAutoPaletteEnabled;
      delete storage.contextAutoPaletteCache;
      delete storage.contextAutoPaletteBase;
      storage.retiredContextAutoPalettesV116 = true;
    }
  } catch {}

  // Remove the retired one-color palette generator without changing any
  // appearance values that it may already have applied.
  try {
    if (storage.retiredPaletteGeneratorV117 !== true) {
      delete storage.autoPaletteSeed;
      delete storage.autoPaletteStyle;
      delete storage.autoPaletteScope;
      storage.retiredPaletteGeneratorV117 = true;
    }
  } catch {}

  for (const [key, value] of Object.entries(DEFAULTS)) {
    try { if (storage[key] == null) storage[key] = value; } catch {}
  }

  let unpatchFolder = null;
  let unpatchFolderJSX = null;
  let unpatchFolderBG = null;
  let unpatchMentions = null;
  let unpatchMentionTags = null;
  let unpatchGuildBarStyles = null;
  let unpatchGuildBarDirect = null;
  let unpatchGuildIndicator = null;
  let unpatchHomeIcon = null;
  let unpatchChatIcon = null;
  let unpatchSearchIcon = null;
  let unpatchChannelSearchIcon = null;
  let unpatchBellIcon = null;
  let unpatchBellSlashIcon = null;
  let unpatchBellZIcon = null;
  let unpatchChannelNotificationIcon = null;
  let unpatchChatNotificationIcon = null;
  let unpatchSettingsIcon = null;
  let unpatchBaseIconImage = null;
  let unpatchLegacyIconRender = null;
  let unpatchNativeImageRender = null;
  let unpatchSearchButtonDirect = null;
  let unpatchDesignIconButton = null;
  let unpatchGuildSearchContainer = null;
  let unpatchIconActionButton = null;
  let unpatchLegacyHeaderIcon = null;
  let unpatchHeaderIconButton = null;
  let unpatchGuildWrapperOverlay = null;
  let unpatchChannelUnread = null;
  let unpatchChannelUnreadDirect = null;
  let unpatchMessageRowManager = null;
  let appStateSubscription = null;
  let messageRowRefreshTimer = null;
  let toolkitAppearanceRevision = 0;
  let visualRevision = 0;
  let themeTrackingActive = false;
  let observedThemeStore = null;
  let themeStoreReady = false;
  let themeObservationGeneration = 0;
  let themeStorageCleanup = null;
  let themeRefreshTimer = null;
  const themeReadySymbol = Symbol.for("vendetta.storage.accessor");
  const themeEmitterSymbol = Symbol.for("vendetta.storage.emitter");
  const visualSubscribers = new Set();
  const colorSubscribers = new Set();
  let colorTimer = null;
  let appIsActive = RN.AppState?.currentState ? RN.AppState.currentState === "active" : true;
  const animationEpoch = Date.now();
  const motionClocks = new Map();
  const pathGeometryCache = new Map();
  const searchRenderWrappers = new WeakMap();
  const guildIndicatorRenderWrappers = new WeakMap();
  const messageRowRefreshers = new Map();
  const messageRowAppliedRevisions = new Map();
  let iconReplacementsActive = false;
  let folderVisualsActive = true;
  const FolderIconContext = React.createContext?.(null) ?? null;
  const guildFolderIconWrappers = new WeakMap();
  let iconReplacementPatches = [];
  let iconImageRevision = 0;
  let cachedIconPackText = null;
  let cachedIconPack = null;
  const failedIconImages = new Set();
  const iconImageStats = Object.fromEntries(ICON_SLOTS.map(slot => [slot.key, { loaded: 0, errors: 0 }]));
  const folderRendererStats = { renderItem: false, callbacks: 0, iconItems: 0, components: 0, componentRenders: 0, targets: 0, unmatched: 0, arguments: "", lastLayout: "", lastComponentLayout: "" };
  const folderSurfaceStats = {
    parentRenders: 0, transitionMisses: 0, unmatchedLayouts: [], decisions: [],
    jsx: { installed: false, component: "", callbacks: 0, matches: 0 },
    closed: { transitions: 0, wrapCalls: 0, attached: 0, renders: 0, parents: [], wrappers: [], surfaces: [], last: null },
    open: { transitions: 0, wrapCalls: 0, attached: 0, renders: 0, parents: [], wrappers: [], surfaces: [], last: null },
  };
  const iconAssetIds = (() => {
    try {
      return {
        home: getAssetIDByName?.("HomeIcon"),
        chat: getAssetIDByName?.("ChatIcon"),
        search: getAssetIDByName?.("MagnifyingGlassIcon"),
        channelSearch: getAssetIDByName?.("ChannelListMagnifyingGlassIcon"),
        legacySearch: getAssetIDByName?.("SearchIcon"),
        bell: getAssetIDByName?.("BellIcon"),
        bellSlash: getAssetIDByName?.("BellSlashIcon"),
        bellZ: getAssetIDByName?.("BellZIcon"),
        channelNotification: getAssetIDByName?.("ChannelNotificationIcon"),
        chatNotification: getAssetIDByName?.("ChatNotificationIcon"),
        notification: getAssetIDByName?.("NotificationIcon"),
        notifications: getAssetIDByName?.("NotificationsIcon"),
        settings: getAssetIDByName?.("SettingsIcon"),
      };
    } catch { return {}; }
  })();

  function toast(text) { try { showToast?.(text, toolkitIcon); } catch {} }
  function notifyVisuals() {
    visualRevision++;
    for (const fn of [...visualSubscribers]) { try { fn(); } catch {} }
  }
  function useToolkitRevision() {
    const [, bump] = React.useReducer(v => v + 1, 0);
    const renderedRevision = visualRevision;
    React.useEffect(() => {
      visualSubscribers.add(bump);
      // Theme storage can become ready between this render and subscription.
      if (renderedRevision !== visualRevision) bump();
      resumeSharedMotionClocks();
      return () => {
        visualSubscribers.delete(bump);
        if (!visualSubscribers.size) pauseSharedMotionClocks();
      };
    }, []);
  }
  function refreshFolderUI() {
    notifyVisuals();
    try { FolderStore?.emitChange?.(); } catch {}
  }
  function refreshCurrentMessageRows() {
    const channelId = selectedChannelId();
    const key = channelId ? String(channelId) : "";
    const refresh = key ? messageRowRefreshers.get(key) : null;
    if (typeof refresh !== "function") return false;
    messageRowAppliedRevisions.set(key, toolkitAppearanceRevision);
    try {
      refresh();
      return true;
    } catch (error) {
      try { console.error("[ThemeToolkit] message row refresh failed", error); } catch {}
      messageRowRefreshers.delete(key);
      messageRowAppliedRevisions.delete(key);
      return false;
    }
  }
  function refreshMentionUI() {
    refreshCurrentMessageRows();
    try { MessageStore?.emitChange?.(); } catch {}
    if (messageRowRefreshTimer != null) clearTimeout(messageRowRefreshTimer);
    messageRowRefreshTimer = setTimeout(() => {
      messageRowRefreshTimer = null;
      refreshCurrentMessageRows();
      try { MessageStore?.emitChange?.(); } catch {}
    }, 200);
  }
  function refreshContextUI() {
    const stores = new Set([SelectedGuildStore, SelectedChannelStore, ChannelStore, GuildStore].filter(Boolean));
    for (const store of stores) {
      try { store.emitChange?.(); } catch {}
    }
  }
  function refreshToolkitUI() {
    if (builderStarted) syncBuilderAppearance();
    toolkitAppearanceRevision++;
    refreshFolderUI();
    refreshMentionUI();
    refreshContextUI();
  }
  function colorTimerNeeded() {
    return colorSubscribers.size > 0;
  }
  function ensureColorTimer() {
    if (colorTimer || !colorTimerNeeded() || !appIsActive) return;
    colorTimer = setInterval(() => {
      if (!appIsActive) return;
      const now = Date.now();
      for (const fn of [...colorSubscribers]) { try { fn(now); } catch {} }
      stopColorTimerIfIdle();
    }, 150);
  }
  function stopColorTimerIfIdle() {
    if (colorTimerNeeded() || !colorTimer) return;
    clearInterval(colorTimer);
    colorTimer = null;
  }
  function stopColorTimer() {
    if (!colorTimer) return;
    clearInterval(colorTimer);
    colorTimer = null;
  }

  function colorValue(value) {
    if (Array.isArray(value)) value = value.find(x => typeof x === "string");
    if (typeof value !== "string") return null;
    let out = value.trim();
    if (!out) return null;
    if (!out.startsWith("#")) out = `#${out}`;
    if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(out)) return null;
    return out.toUpperCase();
  }
  function nativeColor(value) {
    const hex = colorValue(value);
    if (!hex) return null;
    try { return RN.processColor?.(hex) ?? hex; } catch { return hex; }
  }
  function stripAlpha(value) {
    const hex = colorValue(value);
    return hex ? hex.slice(0, 7) : null;
  }
  function colorAlpha(value, fallback = 1) {
    const hex = colorValue(value);
    if (!hex || hex.length !== 9) return fallback;
    return parseInt(hex.slice(7, 9), 16) / 255;
  }
  function withAlpha(value, alpha) {
    const hex = stripAlpha(value);
    if (!hex) return null;
    const byte = Math.max(0, Math.min(255, Math.round(alpha * 255))).toString(16).padStart(2, "0").toUpperCase();
    return `${hex}${byte}`;
  }
  function multiplyAlpha(value, factor, fallback = 1) {
    const hex = colorValue(value);
    if (!hex) return null;
    return withAlpha(hex, Math.max(0, Math.min(1, colorAlpha(hex, fallback) * factor)));
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function selectedChannelId(guildId = null) {
    try {
      return SelectedChannelStore?.getCurrentlySelectedChannelId?.(guildId)
        ?? SelectedChannelStore?.getChannelId?.(guildId, false)
        ?? SelectedChannelStore?.getChannelId?.()
        ?? null;
    } catch { return null; }
  }
  function appearanceSnapshot() {
    const values = {};
    for (const key of PROFILE_SETTING_KEYS) {
      const value = storage[key];
      if (isAppearanceValue(value)) values[key] = value;
    }
    return values;
  }
  function isAppearanceValue(value) {
    return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
  }
  function sanitizeProfileRecord(profile, fallbackId) {
    if (!profile || typeof profile !== "object" || typeof profile.name !== "string" || !profile.values || typeof profile.values !== "object") return null;
    const name = profile.name.trim().replace(/\s+/g, " ").slice(0, 32);
    if (!name) return null;
    const migratedValues = migrateMentionEffectSources(profile.values);
    const values = {};
    for (const key of PROFILE_SETTING_KEYS) {
      const value = migratedValues[key];
      if (isAppearanceValue(value)) values[key] = value;
    }
    return {
      id: typeof profile.id === "string" && profile.id ? profile.id : fallbackId,
      name,
      savedAt: Number.isFinite(profile.savedAt) ? profile.savedAt : 0,
      schema: 1,
      values,
    };
  }
  function storedProfiles() {
    if (!Array.isArray(storage.toolkitProfiles)) return [];
    return storage.toolkitProfiles.slice(0, PROFILE_LIMIT)
      .flatMap((profile, index) => sanitizeProfileRecord(profile, `legacy-${index}`) ?? []);
  }
  function appearanceValue(values, key) {
    return Object.prototype.hasOwnProperty.call(values ?? {}, key) ? values[key] : APPEARANCE_DEFAULTS[key];
  }
  function materializeAppearanceValues(values) {
    const migratedValues = migrateMentionEffectSources(values);
    const complete = {};
    for (const key of PROFILE_SETTING_KEYS) complete[key] = appearanceValue(migratedValues, key);
    return complete;
  }
  function appearanceValuesMatch(left, right) {
    return PROFILE_SETTING_KEYS.every(key => appearanceValue(left, key) === appearanceValue(right, key));
  }
  function profileSummary(profile) {
    const values = profile?.values ?? {};
    const sourceLabel = value => value === "toolkit" ? "Toolkit" : value === "discord" ? "Discord" : "Theme / Auto";
    const uiSource = appearanceValue(values, "uiAccentSource");
    const backgroundSource = appearanceValue(values, "mentionBackgroundSource");
    const lineSource = appearanceValue(values, "mentionLineSource");
    const mentionSummary = backgroundSource === lineSource
      ? sourceLabel(backgroundSource)
      : `Background ${sourceLabel(backgroundSource)} / Line ${sourceLabel(lineSource)}`;
    if (uiSource !== "toolkit") return `UI ${sourceLabel(uiSource)} • Mentions ${mentionSummary}`;
    const search = colorValue(appearanceValue(values, "searchIconAccent")) ?? "fallback";
    const notification = colorValue(appearanceValue(values, "notificationIconAccent")) ?? "fallback";
    const reaction = colorValue(appearanceValue(values, "reactionAccent")) ?? "fallback";
    return `UI Toolkit • Search ${search} • Bell ${notification} • Reaction ${reaction} • Mentions ${mentionSummary}`;
  }
  function createProfileBackup(profiles) {
    return JSON.stringify({
      format: PROFILE_BACKUP_FORMAT,
      version: PROFILE_BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      profiles: profiles.map(profile => ({
        name: profile.name,
        savedAt: profile.savedAt,
        schema: 1,
        values: materializeAppearanceValues(profile.values),
      })),
    }, null, 2);
  }
  function parseProfileBackup(text) {
    if (String(text ?? "").length > PROFILE_BACKUP_TEXT_LIMIT) throw new Error("That profile backup is too large");
    let parsed;
    try { parsed = JSON.parse(String(text ?? "")); }
    catch { throw new Error("That is not valid JSON"); }
    if (!parsed || typeof parsed !== "object" || parsed.format !== PROFILE_BACKUP_FORMAT || parsed.version !== PROFILE_BACKUP_VERSION || !Array.isArray(parsed.profiles)) {
      throw new Error("That is not a Theme Toolkit profile backup");
    }
    const profiles = parsed.profiles.slice(0, 100).flatMap((profile, index) => {
      const sanitized = sanitizeProfileRecord(profile, `import-${index}`);
      return sanitized ? [{ ...sanitized, values: materializeAppearanceValues(sanitized.values) }] : [];
    });
    if (!profiles.length) throw new Error("The backup contains no valid profiles");
    return profiles;
  }
  function uniqueImportedName(baseName, usedNames) {
    for (let index = 1; index <= 100; index++) {
      const suffix = index === 1 ? " (Imported)" : ` (Imported ${index})`;
      const candidate = `${baseName.slice(0, Math.max(1, 32 - suffix.length)).trimEnd()}${suffix}`;
      if (!usedNames.has(candidate.toLowerCase())) return candidate;
    }
    return `Imported ${Date.now().toString(36)}`.slice(0, 32);
  }
  function mergeImportedProfiles(existingProfiles, importedProfiles) {
    const next = existingProfiles.slice(0, PROFILE_LIMIT);
    const usedNames = new Set(next.map(profile => profile.name.toLowerCase()));
    let added = 0;
    let duplicates = 0;
    let renamed = 0;
    let omitted = 0;
    for (const imported of importedProfiles) {
      const sameName = next.find(profile => profile.name.toLowerCase() === imported.name.toLowerCase());
      if (sameName && appearanceValuesMatch(sameName.values, imported.values)) {
        duplicates++;
        continue;
      }
      if (next.length >= PROFILE_LIMIT) {
        omitted++;
        continue;
      }
      let name = imported.name;
      if (usedNames.has(name.toLowerCase())) {
        name = uniqueImportedName(name, usedNames);
        renamed++;
      }
      usedNames.add(name.toLowerCase());
      next.push({
        id: `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${added}`,
        name,
        savedAt: imported.savedAt || Date.now(),
        schema: 1,
        values: imported.values,
      });
      added++;
    }
    return { next, added, duplicates, renamed, omitted };
  }
  function copyToClipboard(text) {
    try {
      if (typeof ClipboardModule?.setString === "function") {
        ClipboardModule.setString(text);
        return true;
      }
      if (typeof ClipboardModule?.setStringAsync === "function") {
        void ClipboardModule.setStringAsync(text);
        return true;
      }
    } catch {}
    return false;
  }
  async function readFromClipboard() {
    try {
      if (typeof ClipboardModule?.getString === "function") return String(await ClipboardModule.getString());
      if (typeof ClipboardModule?.getStringAsync === "function") return String(await ClipboardModule.getStringAsync());
    } catch {}
    return null;
  }
  function applyAppearanceValues(values) {
    if (!values || typeof values !== "object") return;
    for (const key of PROFILE_SETTING_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(values, key)) continue;
      const value = values[key];
      if (isAppearanceValue(value)) storage[key] = value;
    }
  }
  function scheduleDiscordReload() {
    const manager = RN.NativeModules?.BundleUpdaterManager
      ?? globalThis?.nativeModuleProxy?.BundleUpdaterManager
      ?? globalThis?.window?.nativeModuleProxy?.BundleUpdaterManager;
    if (typeof manager?.reload !== "function") return false;
    setTimeout(() => {
      try { manager.reload(); }
      catch (error) { try { console.error("[ThemeToolkit] Discord reload failed", error); } catch {} }
    }, 750);
    return true;
  }
  function normalizePattern(value, fallback = "solid") {
    return ["solid", "dashed", "dotted", "segmented"].includes(value) ? value : fallback;
  }
  function normalizeWidth(value, fallback = 1) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(1, Math.min(3, n)) : fallback;
  }
  function normalizeAnimation(value, fallback = "none") {
    return ["none", "pulse", "breathe", "glow", "chase", "marquee", "spin"].includes(value) ? value : fallback;
  }
  function normalizeSpeed(value, fallback = "normal") {
    return ["slow", "normal", "fast"].includes(value) ? value : fallback;
  }
  function normalizeGlow(value, fallback = 2) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(1, Math.min(3, n)) : fallback;
  }
  function normalizeBrightness(value, fallback = "normal") {
    return ["normal", "bright", "max"].includes(value) ? value : fallback;
  }
  function normalizeTrail(value, fallback = "medium") {
    return ["short", "medium", "long"].includes(value) ? value : fallback;
  }
  function normalizeMentionTagMode(value, fallback = "solid") {
    return ["solid", "gradient"].includes(value) ? value : fallback;
  }
  function normalizeMentionSource(value, fallback = "theme") {
    return ["theme", "toolkit", "discord"].includes(value) ? value : fallback;
  }
  function migrateMentionEffectSources(values) {
    const next = { ...(values ?? {}) };
    const legacySource = normalizeMentionSource(next.mentionColorSource, "theme");
    next.mentionBackgroundSource = normalizeMentionSource(
      next.mentionBackgroundSource,
      next.mentionBackgroundEnabled === false ? "discord" : legacySource,
    );
    next.mentionLineSource = normalizeMentionSource(
      next.mentionLineSource,
      next.mentionLineEnabled === false ? "discord" : legacySource,
    );
    delete next.mentionColorSource;
    delete next.mentionBackgroundEnabled;
    delete next.mentionLineEnabled;
    return next;
  }

  function themeAPI() {
    try {
      const api = globalThis?.bunny ?? globalThis?.window?.bunny;
      return api?.themes ?? null;
    } catch { return null; }
  }
  function themeStorage() {
    try { return themeAPI()?.themes ?? vendetta.themes?.themes ?? null; } catch { return null; }
  }
  function loaderTheme() {
    try {
      return themeAPI()?.getThemeFromLoader?.() ?? vendetta.themes?.getCurrentTheme?.() ?? null;
    } catch { return null; }
  }
  function currentTheme() {
    const store = themeStorage();
    if (store) {
      try {
        // The full JS record retains custom metadata that native loaders can omit.
        const selected = Object.values(store).find(theme => theme?.selected);
        if (selected) return selected;
        const pending = store === observedThemeStore ? !themeStoreReady
          : typeof store[themeReadySymbol] === "function" && !store[themeEmitterSymbol];
        // A ready store with no selection means Discord/default, even when the
        // loader still holds a snapshot of the theme selected at app startup.
        return pending ? loaderTheme() : null;
      } catch { return null; }
    }
    try {
      const api = themeAPI();
      return typeof api?.getCurrentTheme === "function" ? api.getCurrentTheme() : loaderTheme();
    } catch { return null; }
  }
  function queueThemeRefresh() {
    if (!themeTrackingActive || themeRefreshTimer != null) return;
    // Selecting/refetching a theme can emit several synchronous storage writes.
    themeRefreshTimer = setTimeout(() => {
      themeRefreshTimer = null;
      if (themeTrackingActive) refreshToolkitUI();
    }, 0);
  }
  function observeThemeStorage() {
    const store = themeStorage();
    if (!themeTrackingActive || store === observedThemeStore) return;
    try { themeStorageCleanup?.(); } catch {}
    themeStorageCleanup = null;
    observedThemeStore = store;
    themeStoreReady = false;
    const generation = ++themeObservationGeneration;
    if (!store) return;
    const ready = () => {
      if (!themeTrackingActive || generation !== themeObservationGeneration) return;
      themeStoreReady = true;
      try {
        const emitter = store[themeEmitterSymbol];
        if (typeof emitter?.on === "function" && typeof emitter?.off === "function") {
          themeStorageCleanup = () => {
            emitter.off("SET", queueThemeRefresh);
            emitter.off("DEL", queueThemeRefresh);
          };
          emitter.on("SET", queueThemeRefresh);
          emitter.on("DEL", queueThemeRefresh);
        }
      } catch {}
      queueThemeRefresh();
    };
    try {
      const awaitReady = store[themeReadySymbol];
      if (typeof awaitReady === "function") awaitReady(ready);
      else ready();
    } catch { ready(); }
  }
  function startThemeTracking() {
    themeTrackingActive = true;
    observeThemeStorage();
  }
  function stopThemeTracking() {
    themeTrackingActive = false;
    themeObservationGeneration++;
    try { themeStorageCleanup?.(); } catch {}
    themeStorageCleanup = null;
    observedThemeStore = null;
    themeStoreReady = false;
    if (themeRefreshTimer != null) clearTimeout(themeRefreshTimer);
    themeRefreshTimer = null;
  }
  function inactiveOutline() {
    return {
      enabled: false, color: null, colorMode: "solid", gradient: [], width: 1,
      pattern: "solid", animation: "none", speed: "normal", glow: 2,
      brightness: "normal", trail: "medium",
    };
  }
  function themeOutlineConfig(extra, state, fallbackColor) {
    const specific = extra?.[state] ?? {};
    const gradient = [
      colorValue(specific.gradient1 ?? specific.gradient?.[0]),
      colorValue(specific.gradient2 ?? specific.gradient?.[1]),
      colorValue(specific.gradient3 ?? specific.gradient?.[2]),
    ].filter(Boolean);
    let colorMode = String(specific.colorMode ?? "solid").toLowerCase();
    if (!["solid", "rgb", "rainbow", "spectrum", "gradient"].includes(colorMode)) colorMode = "solid";
    if (colorMode === "gradient" && gradient.length < 2) colorMode = "solid";
    return {
      enabled: specific.outline !== false && specific.outlineEnabled !== false,
      color: colorValue(specific.outlineColor) ?? colorValue(specific.border) ?? colorValue(extra?.border) ?? fallbackColor,
      colorMode,
      gradient,
      width: normalizeWidth(specific.outlineWidth ?? specific.borderWidth ?? extra?.borderWidth, 1),
      pattern: normalizePattern(specific.outlinePattern ?? specific.pattern ?? extra?.pattern, "solid"),
      animation: normalizeAnimation(specific.animation, "none"),
      speed: normalizeSpeed(specific.speed, "normal"),
      glow: normalizeGlow(specific.glowStrength ?? specific.glow, 2),
      brightness: normalizeBrightness(specific.brightness, "normal"),
      trail: normalizeTrail(specific.trailLength ?? specific.trail, "medium"),
    };
  }
  function themeFolderConfig(theme = currentTheme()) {
    const data = theme?.data ?? null;
    if (!data) {
      return { hasTheme: false, hasMetadata: false, background: null, accent: null, cover: "preview", closed: inactiveOutline(), open: inactiveOutline() };
    }
    const semantic = data.semanticColors ?? {};
    const raw = data.rawColors ?? {};
    const extra = data.themeToolkit?.folders ?? {};
    const background = colorValue(extra.background)
      ?? colorValue(semantic.GUILD_FOLDER_BACKGROUND)
      ?? colorValue(semantic.BACKGROUND_PRIMARY)
      ?? colorValue(semantic.BACKGROUND_BASE_LOWEST);
    const accent = colorValue(extra.accent)
      ?? colorValue(semantic.HEADER_PRIMARY)
      ?? originalInterfaceIconToken(data, "INTERACTIVE_ACTIVE")
      ?? colorValue(raw.WHITE_500)
      ?? colorValue(raw.BRAND_360);
    return {
      hasTheme: true,
      hasMetadata: !!data.themeToolkit,
      background,
      accent,
      cover: extra.cover === "folder" ? "folder" : "preview",
      closed: themeOutlineConfig(extra, "closed", accent),
      open: themeOutlineConfig(extra, "open", accent),
    };
  }
  function themeMentionConfig(theme = currentTheme()) {
    const data = theme?.data ?? null;
    if (!data) {
      return {
        hasTheme: false,
        background: null,
        line: null,
        tagMode: "solid",
        tagColor: null,
        tagGradient: [],
      };
    }
    const semantic = data.semanticColors ?? {};
    const raw = data.rawColors ?? {};
    const extra = data.themeToolkit?.mentions ?? {};
    const tag = extra.tag ?? extra.inline ?? {};
    const tagGradient = [
      colorValue(tag.gradient1 ?? tag.gradient?.[0]),
      colorValue(tag.gradient2 ?? tag.gradient?.[1]),
      colorValue(tag.gradient3 ?? tag.gradient?.[2]),
    ].filter(Boolean).map(stripAlpha).filter(Boolean);
    const tagColor = stripAlpha(
      colorValue(tag.color)
        ?? colorValue(tag.text)
        ?? colorValue(extra.tagColor)
        ?? colorValue(semantic.MENTION_FOREGROUND)
        ?? colorValue(semantic.TEXT_LINK)
        ?? colorValue(raw.BRAND_360)
    );
    return {
      hasTheme: true,
      background: colorValue(extra.background)
        ?? colorValue(semantic.MESSAGE_MENTIONED_BACKGROUND_DEFAULT)
        ?? colorValue(semantic.BACKGROUND_MENTIONED)
        ?? colorValue(semantic.MENTION_BACKGROUND),
      line: colorValue(extra.line)
        ?? colorValue(extra.gutter)
        ?? colorValue(semantic.MENTION_FOREGROUND)
        ?? colorValue(semantic.TEXT_LINK)
        ?? colorValue(raw.YELLOW_300)
        ?? colorValue(raw.YELLOW_360),
      tagMode: tagGradient.length >= 2 ? "gradient" : "solid",
      tagColor,
      tagGradient,
    };
  }

  function effectiveMentionConfig(values = storage, selectedTheme = currentTheme()) {
    const theme = themeMentionConfig(selectedTheme);
    const resolveEffect = (requested, toolkitColor, themeColor) => {
      const source = normalizeMentionSource(requested, "theme");
      if (source === "toolkit") return { source, color: colorValue(toolkitColor) };
      if (source === "theme" && theme.hasTheme) return { source, color: themeColor };
      return { source: "discord", color: null };
    };
    const background = resolveEffect(values.mentionBackgroundSource, values.mentionBackground, theme.background);
    const line = resolveEffect(values.mentionLineSource, values.mentionLine, theme.line);
    return {
      backgroundSource: background.source,
      backgroundEnabled: background.source !== "discord",
      background: background.color,
      lineSource: line.source,
      lineEnabled: line.source !== "discord",
      line: line.color,
    };
  }

  function themeMessageBaseColor(theme = currentTheme()) {
    const data = theme?.data ?? null;
    const semantic = data?.semanticColors ?? {};
    return colorValue(semantic.CHAT_BACKGROUND)
      ?? colorValue(semantic.BACKGROUND_PRIMARY)
      ?? colorValue(semantic.BACKGROUND_BASE_LOWEST)
      ?? colorValue(semantic.BACKGROUND_BASE_LOW)
      ?? "#313338";
  }
  function rgbParts(value) {
    const hex = stripAlpha(value);
    if (!hex) return null;
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }
  function blendOver(foreground, background) {
    const fg = rgbParts(foreground);
    const bg = rgbParts(background);
    if (!fg || !bg) return stripAlpha(foreground) ?? stripAlpha(background);
    const a = colorAlpha(foreground, 1);
    const blend = (x, y) => Math.round(x * a + y * (1 - a));
    return `#${[blend(fg.r, bg.r), blend(fg.g, bg.g), blend(fg.b, bg.b)]
      .map(n => n.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  }
  function relativeLuminance(value) {
    const rgb = rgbParts(value);
    if (!rgb) return 0;
    const linear = n => {
      const s = n / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
  }
  function autoContrastText(background, base = themeMessageBaseColor()) {
    const effective = blendOver(background, base);
    if (!effective) return null;
    const lum = relativeLuminance(effective);
    const whiteContrast = 1.05 / (lum + 0.05);
    const blackContrast = (lum + 0.05) / 0.05;
    return blackContrast >= whiteContrast ? "#000000" : "#FFFFFF";
  }
  function effectiveMentionTextColor(cfg, values = storage, theme = currentTheme()) {
    const mode = values.mentionTextMode ?? "auto";
    if (mode === "theme") return null;
    if (mode === "custom") return stripAlpha(values.mentionTextColor);
    if (mode === "auto" && cfg.backgroundEnabled && cfg.background) return autoContrastText(cfg.background, themeMessageBaseColor(theme));
    return null;
  }

  function themeUIAccentConfig(theme = currentTheme()) {
    const data = theme?.data ?? null;
    if (!data) return { hasTheme: false, accent: null, selectedGuild: null, reaction: null, icon: null };
    const semantic = data.semanticColors ?? {};
    const raw = data.rawColors ?? {};
    const extra = data.themeToolkit?.ui ?? data.themeToolkit?.accents ?? {};
    const accent = colorValue(extra.accent)
      ?? originalInterfaceIconToken(data, "INTERACTIVE_ACTIVE")
      ?? colorValue(semantic.HEADER_PRIMARY)
      ?? colorValue(semantic.BACKGROUND_BRAND)
      ?? colorValue(semantic.BUTTON_POSITIVE_BACKGROUND)
      ?? colorValue(raw.BRAND_360)
      ?? colorValue(raw.BRAND_500);
    return {
      hasTheme: true,
      accent,
      selectedGuild: colorValue(extra.selectedGuild) ?? colorValue(extra.guildSelected) ?? accent,
      reaction: colorValue(extra.reaction) ?? colorValue(semantic.REACTION_BACKGROUND_REACTED_DEFAULT) ?? accent,
      icon: colorValue(extra.icon)
        ?? colorValue(semantic.INTERACTIVE_ICON_DEFAULT)
        ?? colorValue(semantic.INTERACTIVE_NORMAL)
        ?? colorValue(semantic.TEXT_STRONG)
        ?? colorValue(semantic.HEADER_PRIMARY)
        ?? accent,
    };
  }
  function effectiveUIAccentConfig(values = storage, selectedTheme = currentTheme()) {
    const config = legacyUIAccentConfig(values, selectedTheme);
    const color = interfaceIconColor(selectedTheme);
    return color ? { ...config, source: config.source === "discord" ? "toolkit" : config.source,
      homeIcon: color, searchIcon: color, notificationIcon: color, settingsIcon: color } : config;
  }
  function legacyUIAccentConfig(values = storage, selectedTheme = currentTheme()) {
    const requested = values.uiAccentSource ?? "theme";
    const theme = themeUIAccentConfig(selectedTheme);
    if (requested === "toolkit") {
      const accent = colorValue(values.smartAccentColor);
      return {
        source: "toolkit",
        accent,
        selectedGuild: colorValue(values.selectedGuildAccent) ?? accent,
        reaction: colorValue(values.reactionAccent) ?? accent,
        homeIcon: colorValue(values.homeIconAccent) ?? accent,
        searchIcon: colorValue(values.searchIconAccent) ?? accent,
        notificationIcon: colorValue(values.notificationIconAccent) ?? accent,
        settingsIcon: colorValue(values.settingsIconAccent) ?? accent,
      };
    }
    if (requested === "theme" && theme.hasTheme) {
      return {
        source: "theme",
        accent: theme.accent,
        selectedGuild: theme.selectedGuild,
        reaction: theme.reaction,
        homeIcon: theme.icon,
        searchIcon: theme.icon,
        notificationIcon: theme.icon,
        settingsIcon: theme.icon,
      };
    }
    return { source: "discord", accent: null, selectedGuild: null, reaction: null, homeIcon: null, searchIcon: null, notificationIcon: null, settingsIcon: null };
  }

  function iconImage(value) {
    if (typeof value === "string") value = { uri: value };
    const uri = typeof value?.uri === "string" ? value.uri.trim() : "";
    if (!uri || uri.length > 4096) return null;
    const remote = /^https:\/\/[^\s]+$/i.test(uri);
    const embedded = /^data:image\/png;base64,iVBOR[A-Za-z0-9+/]*={0,2}$/.test(uri);
    return remote || embedded ? { uri, tint: value?.tint === true } : null;
  }
  function storedIconImage(value) {
    try { return iconImage(String(value ?? "").trim().startsWith("{") ? JSON.parse(value) : value); }
    catch { return null; }
  }
  function parseIconPack(text) {
    if (typeof text !== "string" || text.length > ICON_PACK_TEXT_LIMIT) throw new Error("Icon pack must be under 16,000 characters");
    let pack;
    try { pack = JSON.parse(text); } catch { throw new Error("That icon pack is not valid JSON"); }
    if (pack?.format !== "theme-toolkit-icon-pack" || pack.version !== 1 || typeof pack.name !== "string" || !pack.name.trim()) {
      throw new Error("That is not a Theme Toolkit icon pack");
    }
    const preset = ["outline", "solid"].includes(pack.preset) ? pack.preset : null;
    if (pack.preset != null && !preset) throw new Error("Unknown icon pack preset");
    if (!pack.icons || typeof pack.icons !== "object" || Array.isArray(pack.icons)) throw new Error("Icon pack needs an icons object");
    const icons = {};
    for (const key of Object.keys(pack.icons)) {
      if (!ICON_SLOTS.some(slot => slot.key === key)) throw new Error(`Unknown icon: ${key}`);
      const entry = pack.icons[key];
      const image = entry === null ? null : iconImage(entry);
      if (entry !== null && !image) throw new Error(`Invalid ${key} image. Use an HTTPS image URL or a small PNG data URI.`);
      icons[key] = image;
    }
    if (!preset && !Object.keys(icons).length) throw new Error("The pack has no icons");
    return { format: "theme-toolkit-icon-pack", version: 1, name: pack.name.trim().slice(0, 48), preset, icons };
  }
  function importedIconPack() {
    const value = storage.iconCustomPack;
    if (value !== cachedIconPackText) {
      cachedIconPackText = value;
      try { cachedIconPack = parseIconPack(value); } catch { cachedIconPack = null; }
    }
    return cachedIconPack;
  }
  function iconFromPack(pack, slot) {
    if (!pack || !ICON_SLOTS.some(item => item.key === slot)) return null;
    if (Object.prototype.hasOwnProperty.call(pack.icons ?? {}, slot)) return iconImage(pack.icons[slot]);
    const uri = BUILTIN_ICON_PACKS[pack.preset]?.[slot];
    return uri ? { uri, tint: true } : null;
  }
  function effectiveIconImage(slot, values = storage, theme = currentTheme()) {
    if (values.iconSource === "theme") {
      return iconFromPack(theme?.data?.themeToolkit?.icons, slot);
    }
    if (values.iconSource !== "toolkit") return null;
    const mode = values[`${slot}IconMode`];
    if (mode === "discord") return null;
    if (mode === "custom") return storedIconImage(values[`${slot}IconImage`]);
    if (values.iconPack !== "custom") return iconFromPack({ preset: values.iconPack }, slot);
    let pack = null;
    if (values === storage) pack = importedIconPack();
    else { try { pack = parseIconPack(values.iconCustomPack); } catch {} }
    return iconFromPack(pack, slot);
  }
  function exportIconPack() {
    const base = storage.iconPack === "custom" ? importedIconPack() : { preset: storage.iconPack, icons: {} };
    if (!base) throw new Error("Import a pack first");
    const icons = { ...base.icons };
    for (const { key } of ICON_SLOTS) {
      const mode = storage[`${key}IconMode`];
      if (mode === "discord") icons[key] = null;
      else if (mode === "custom") icons[key] = storedIconImage(storage[`${key}IconImage`]);
    }
    const text = JSON.stringify({ format: "theme-toolkit-icon-pack", version: 1, name: base.name ?? "My icon pack", preset: base.preset, icons });
    parseIconPack(text);
    return text;
  }
  function iconSlotForSource(source) {
    const raw = source?.default ?? source;
    if (raw == null) return null;
    for (const alias of ICON_ALIASES) {
      if ((alias.assetId != null && raw === alias.assetId)
        || source?.name === alias.name || raw?.name === alias.name
        || (alias.original && raw === alias.original)
        || (alias.module?.[alias.name] && raw === alias.module[alias.name])) return alias.slot;
    }
    return null;
  }
  function iconRenderProps(props, fallback) {
    const original = { ...(fallback?.props ?? {}), ...(props ?? {}) };
    const style = [fallback?.props?.style, props?.style];
    const flat = flattened(style);
    const positive = value => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
    let size = positive(original.size);
    try { size ??= positive(LegacyIconModule?.getIconSize?.(original.size)); } catch {}
    let asset = null;
    try { asset = RN.Image?.resolveAssetSource?.(original.source); } catch {}
    const width = positive(flat.width) ?? positive(original.width) ?? size ?? positive(asset?.width);
    const height = positive(flat.height) ?? positive(original.height) ?? size ?? positive(asset?.height) ?? width;
    return { original, style, width, height, tint: flat.tintColor ?? original.tintColor ?? colorValue(original.color) };
  }
  function retryIconImages() {
    failedIconImages.clear();
    iconImageRevision++;
  }
  function IconReplacement({ slot, originalProps, originalRef, fallback, colorOverride }) {
    useToolkitRevision();
    const [failed, setFailed] = React.useState(null);
    const loaded = React.useRef(null);
    const image = iconReplacementsActive ? effectiveIconImage(slot) : null;
    const imageKey = image ? `${iconImageRevision}:${image.uri}` : null;
    if (!image || failed === imageKey || failedIconImages.has(imageKey) || !RN.Image) return fallback;
    const render = iconRenderProps(originalProps, fallback);
    const colorKey = ICON_SLOTS.find(item => item.key === slot)?.accent;
    const color = colorOverride ?? stripAlpha(effectiveUIAccentConfig()[colorKey]) ?? render.tint;
    if (!render.width || !render.height || (image.tint && color == null)) return fallback;
    const props = {};
    for (const key of ["ref", "accessible", "accessibilityLabel", "accessibilityRole", "accessibilityState", "importantForAccessibility", "testID", "pointerEvents", "onLayout", "onTouchStart", "onTouchEnd", "onLoadStart", "onLoadEnd"]) {
      if (render.original[key] !== undefined) props[key] = render.original[key];
    }
    if (originalRef != null) props.ref = originalRef;
    return React.createElement(RN.Image, {
      ...props,
      source: { uri: image.uri }, resizeMode: "contain", fadeDuration: 0,
      style: [render.style, { width: render.width, height: render.height, tintColor: image.tint ? color : null }],
      onLoad: event => {
        if (loaded.current !== imageKey) { loaded.current = imageKey; iconImageStats[slot].loaded++; }
        try { render.original.onLoad?.(event); } catch {}
      },
      onError: () => {
        if (!failedIconImages.has(imageKey)) iconImageStats[slot].errors++;
        failedIconImages.add(imageKey);
        setFailed(imageKey);
        notifyVisuals();
      },
    });
  }
  function FolderIconReplacement(props) {
    const context = FolderIconContext ? React.useContext(FolderIconContext) : null;
    useToolkitRevision();
    if (!context || !folderVisualsActive) return props.fallback;
    const cfg = effectiveFolderConfig(context.folder);
    return React.createElement(IconReplacement, {
      ...props, slot: context.state === "open" ? "folderOpen" : "folderClosed",
      colorOverride: cfg.source !== "discord" ? cfg.accent : null,
    });
  }
  function folderIconTargets(element, targets = [], budget = { remaining: 64 }) {
    if (--budget.remaining < 0 || element == null) return targets;
    if (Array.isArray(element)) {
      for (const child of element) folderIconTargets(child, targets, budget);
      return targets;
    }
    if (!React.isValidElement(element)) return targets;
    const props = element.props;
    const layout = [RN.View, RN.Text, RN.Pressable, RN.ScrollView, Animated?.View, React.Fragment].includes(element.type);
    const geometry = iconRenderProps(props, element);
    if (!layout && geometry.width && geometry.height
      && (props.source != null || props.viewBox != null || props.children == null)) {
      targets.push(element);
      return targets;
    }
    folderIconTargets(props.children, targets, budget);
    return targets;
  }
  function folderComponentName(type) {
    return typeof type === "string" ? type : type?.displayName ?? type?.name ?? type?.type?.displayName ?? type?.type?.name ?? "Component";
  }
  function guildFolderIconTargets(element, targets = [], budget = { remaining: 64 }) {
    if (--budget.remaining < 0 || element == null) return targets;
    if (Array.isArray(element)) {
      for (const child of element) guildFolderIconTargets(child, targets, budget);
    } else if (React.isValidElement(element)) {
      // This is the deferred component observed in the device diagnostics.
      if (folderComponentName(element.type) === "GuildFolderIcon" && element.props.item?.type === "icon") targets.push(element);
      else guildFolderIconTargets(element.props.children, targets, budget);
    }
    return targets;
  }
  function guildFolderIconWrapper(component, depth = 0) {
    if (!component || !["function", "object"].includes(typeof component) || depth > 4) return null;
    if (guildFolderIconWrappers.has(component)) return guildFolderIconWrappers.get(component);
    let wrapped = null;
    const rendered = result => {
      folderRendererStats.componentRenders++;
      return React.createElement(RenderedGuildFolderIcon, { fallback: result });
    };
    // Invoke the original render unconditionally. Its hooks/lifecycle stay on
    // the same component; Toolkit's own hooks live in the returned child.
    const decorate = render => function ThemeToolkitGuildFolderIcon(...args) {
      return rendered(render.apply(this, args));
    };
    if (typeof component === "function") {
      if (component.prototype?.isReactComponent) {
        wrapped = class ThemeToolkitGuildFolderIcon extends component {
          render(...args) { return rendered(super.render(...args)); }
        };
      } else wrapped = decorate(component);
    } else if (component.$$typeof === Symbol.for("react.memo")) {
      const inner = guildFolderIconWrapper(component.type, depth + 1);
      if (inner) wrapped = React.memo(inner, component.compare);
    } else if (component.$$typeof === Symbol.for("react.forward_ref") && typeof component.render === "function") {
      wrapped = React.forwardRef(decorate(component.render));
    }
    if (wrapped) {
      wrapped.displayName = "ThemeToolkitGuildFolderIcon";
      if (component.defaultProps) wrapped.defaultProps = component.defaultProps;
    }
    guildFolderIconWrappers.set(component, wrapped);
    return wrapped;
  }
  function folderIconLayout(element, depth = 0) {
    if (depth > 3 || element == null) return "";
    if (Array.isArray(element)) return element.slice(0, 3).map(child => folderIconLayout(child, depth + 1)).join(", ");
    if (!React.isValidElement(element)) return "";
    const name = folderComponentName(element.type);
    const keys = Object.keys(element.props).filter(key => key !== "children").slice(0, 12).join(",");
    const geometry = iconRenderProps(element.props, element);
    return `${name}[${geometry.width ?? "?"}x${geometry.height ?? "?"}](${keys}) ${folderIconLayout(element.props.children, depth + 1)}`.trim().slice(0, 240);
  }
  function replaceFolderArtwork(fallback, folder, state) {
    const slot = state === "open" ? "folderOpen" : "folderClosed";
    if (!folderVisualsActive || !iconReplacementsActive || !effectiveIconImage(slot)) return fallback;
    const targets = folderIconTargets(fallback);
    if (targets.length !== 1) {
      folderRendererStats.unmatched++;
      folderRendererStats.lastLayout = folderIconLayout(fallback).slice(0, 240);
      return fallback;
    }
    const target = targets[0];
    folderRendererStats.targets++;
    const cfg = effectiveFolderConfig(folder);
    return replaceReactChild(fallback, target, React.createElement(IconReplacement, {
      key: target.key, slot, originalProps: target.props, fallback: target,
      colorOverride: cfg.source !== "discord" ? cfg.accent : null,
    }));
  }
  function RenderedGuildFolderIcon({ fallback }) {
    useToolkitRevision();
    const context = FolderIconContext ? React.useContext(FolderIconContext) : null;
    folderRendererStats.lastComponentLayout = folderIconLayout(fallback).slice(0, 240);
    return context ? replaceFolderArtwork(fallback, context.folder, context.state) : fallback;
  }
  function FolderItemArtwork({ fallback, folder, state }) {
    useToolkitRevision();
    if (folderVisualsActive && FolderIconContext) {
      const components = guildFolderIconTargets(fallback);
      if (components.length === 1) {
        const target = components[0];
        const wrapped = guildFolderIconWrapper(target.type);
        if (wrapped) {
          folderRendererStats.components++;
          // Read data descriptors to preserve refs without invoking React's
          // development-only ref warning getters on either React 18 or 19.
          const ref = Object.getOwnPropertyDescriptor(target.props, "ref")?.value
            ?? Object.getOwnPropertyDescriptor(target, "ref")?.value;
          return replaceReactChild(fallback, target, React.createElement(wrapped, {
            ...target.props, key: target.key, ...(ref != null ? { ref } : {}),
          }));
        }
      }
    }
    return replaceFolderArtwork(fallback, folder, state);
  }
  function iconDiagnostics() {
    return JSON.stringify({
      version: "2.0.7 TEST", source: storage.iconSource, pack: storage.iconPack,
      folderCover: storage.folderCoverMode,
      closedFolder: storage.folderClosedIconMode, openFolder: storage.folderOpenIconMode,
      folderRenderer: folderRendererStats, images: iconImageStats,
    }, null, 2);
  }
  function folderSurfaceLayout(element) {
    const nodes = [];
    function visit(node, path, depth) {
      if (depth > 5 || nodes.length >= 24 || node == null) return;
      if (Array.isArray(node)) {
        node.slice(0, 8).forEach((child, index) => visit(child, `${path}.${index}`, depth + 1));
        return;
      }
      if (!node.props || !node.type) return;
      const props = node.props;
      // Only structural information: no text, IDs, names, image URLs or callbacks.
      const flat = typeof props.style === "function" ? {} : flattened(props.style);
      const style = {};
      for (const key of ["width", "height", "borderRadius", "borderWidth", "opacity", "zIndex", "flex"]) {
        const value = flat[key];
        if (typeof value === "number" && Number.isFinite(value)) style[key] = value;
        else if (typeof value === "string" && /^\d+(\.\d+)?%$/.test(value)) style[key] = value;
      }
      for (const key of ["backgroundColor", "borderColor"]) {
        if (flat[key] != null) style[key] = colorValue(flat[key]) ?? (typeof flat[key] === "number" ? flat[key] : typeof flat[key]);
      }
      if (["absolute", "relative"].includes(flat.position)) style.position = flat.position;
      nodes.push({ path, type: folderComponentName(node.type).slice(0, 64),
        props: Object.keys(props).filter(key => key !== "children").slice(0, 16), style,
        styleFunction: typeof props.style === "function", children: typeof props.children === "function" ? "function"
          : Array.isArray(props.children) ? "array" : props.children?.props ? "element" : props.children == null ? "none" : "text" });
      if (typeof props.children !== "function") visit(props.children, `${path}.children`, depth + 1);
    }
    try { visit(element, "root", 0); } catch {}
    return nodes;
  }
  function rememberFolderSample(samples, value) {
    if (samples.length >= 3) return;
    const serialized = JSON.stringify(value);
    if (!samples.some(sample => JSON.stringify(sample) === serialized)) samples.push(value);
  }
  function rememberFolderLayout(samples, element) {
    if (samples.length < 3) rememberFolderSample(samples, folderSurfaceLayout(element));
  }
  function folderDiagnostics() {
    const cfg = effectiveFolderConfig(null);
    const theme = themeFolderConfig();
    return JSON.stringify({
      version: "2.0.7 TEST",
      theme: { available: theme.hasTheme, metadata: theme.hasMetadata, storeObserved: !!observedThemeStore, storeReady: themeStoreReady },
      settings: { source: storage.folderColorSource, cover: storage.folderCoverMode,
        closedEnabled: storage.closedOutlineEnabled, closedMode: storage.closedOutlineColorMode,
        openEnabled: storage.openOutlineEnabled, openMode: storage.openOutlineColorMode },
      effective: { source: cfg.source, background: cfg.background, accent: cfg.accent, cover: cfg.cover,
        closedOutline: cfg.closedOutline, openOutline: cfg.openOutline },
      hooks: { folder: typeof unpatchFolder === "function", folderJSX: typeof unpatchFolderJSX === "function", openBackground: typeof unpatchFolderBG === "function" },
      renderer: folderSurfaceStats,
    }, null, 2);
  }
  function patchIconReplacements() {
    const patches = [];
    const patched = new WeakMap();
    function hook(target, method, fixedSlot = null) {
      if (!target || typeof target[method] !== "function") return;
      const methods = patched.get(target) ?? new Set();
      if (methods.has(method)) return;
      try {
        patches.push(after(method, target, (args, result) => {
          const props = args?.[0];
          const slot = fixedSlot ?? iconSlotForSource(props?.source);
          if (!slot || !React.isValidElement(result) || result.type === IconReplacement || result.type === FolderIconReplacement) return result;
          const ref = args?.[1];
          const originalRef = typeof ref === "function" || (ref && typeof ref === "object" && "current" in ref) ? ref : undefined;
          return React.createElement(slot === "folder" ? FolderIconReplacement : IconReplacement, { key: result.key, slot, originalProps: props, originalRef, fallback: result });
        }));
        methods.add(method);
        patched.set(target, methods);
      } catch (error) { try { console.error(`[ThemeToolkit] icon replacement hook ${method} failed`, error); } catch {} }
    }
    for (const alias of ICON_ALIASES) {
      if (typeof alias.module?.[alias.name] === "function") hook(alias.module, alias.name, alias.slot);
      else {
        const resolved = componentRenderTarget(alias.module?.[alias.name]);
        if (resolved) hook(...resolved, alias.slot);
      }
    }
    hook(BaseIconImageModule, "BaseIconImage");
    for (const component of [LegacyIconModule?.default, RN.Image]) {
      const resolved = componentRenderTarget(component);
      if (resolved) hook(...resolved);
    }
    return patches;
  }

  function sourceMatchesAny(source, assets) {
    return assets.some(([id, name]) => iconSourceMatches(source, id, name));
  }
  function isHomeSource(source) {
    return sourceMatchesAny(source, [[iconAssetIds.home, "HomeIcon"], [iconAssetIds.chat, "ChatIcon"]]);
  }
  function isSearchSource(source) {
    return sourceMatchesAny(source, [[iconAssetIds.search, "MagnifyingGlassIcon"], [iconAssetIds.channelSearch, "ChannelListMagnifyingGlassIcon"], [iconAssetIds.legacySearch, "SearchIcon"]]);
  }
  function isSettingsSource(source) {
    return sourceMatchesAny(source, [[iconAssetIds.settings, "SettingsIcon"]]);
  }
  function isNotificationSource(source) {
    return sourceMatchesAny(source, [
      [iconAssetIds.bell, "BellIcon"],
      [iconAssetIds.bellSlash, "BellSlashIcon"],
      [iconAssetIds.bellZ, "BellZIcon"],
      [iconAssetIds.channelNotification, "ChannelNotificationIcon"],
      [iconAssetIds.chatNotification, "ChatNotificationIcon"],
      [iconAssetIds.notification, "NotificationIcon"],
      [iconAssetIds.notifications, "NotificationsIcon"],
    ]);
  }
  function accentForIconSource(source, cfg) {
    if (isHomeSource(source)) return { kind: "home", color: cfg.homeIcon };
    if (isSearchSource(source)) return { kind: "search", color: cfg.searchIcon };
    if (isNotificationSource(source)) return { kind: "notification", color: cfg.notificationIcon };
    if (isSettingsSource(source)) return { kind: "settings", color: cfg.settingsIcon };
    return null;
  }
  function componentRenderTarget(component) {
    if (component?.type && typeof component.type.render === "function") return [component.type, "render"];
    if (component && typeof component.render === "function") return [component, "render"];
    if (component && typeof component.type === "function") return [component, "type"];
    if (component?.prototype && typeof component.prototype.render === "function") return [component.prototype, "render"];
    return null;
  }
  function patchLegacyIconRenderer() {
    const resolved = componentRenderTarget(LegacyIconModule?.default);
    if (!resolved) return null;
    const [target, method] = resolved;
    try {
      return before(method, target, args => {
        try {
          const props = args?.[0];
          if (!props || typeof props !== "object") return;
          const cfg = effectiveUIAccentConfig();
          if (cfg.source === "discord") return;
          const accent = accentForIconSource(props.source, cfg);
          const shared = !props.disableColor && props.color == null && flattened(props.style).tintColor == null ? interfaceIconColor() : null;
          const color = stripAlpha(accent?.color ?? shared);
          if (!color) return;
          args[0] = {
            ...props,
            color,
            disableColor: false,
            style: [props.style, { tintColor: color }],
          };
        } catch (error) {
          try { console.error("[ThemeToolkit] legacy icon renderer recolor failed", error); } catch {}
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed legacy icon renderer hook", error); } catch {}
      return null;
    }
  }
  function patchNativeImageRenderer() {
    const resolved = componentRenderTarget(RN.Image);
    if (!resolved) return null;
    const [target, method] = resolved;
    try {
      return before(method, target, args => {
        try {
          const props = args?.[0];
          if (!props || typeof props !== "object") return;
          const cfg = effectiveUIAccentConfig();
          if (cfg.source === "discord") return;
          const accent = accentForIconSource(props.source, cfg);
          const color = stripAlpha(accent?.color);
          if (!accent || !color) return;
          args[0] = { ...props, style: [props.style, { tintColor: color }] };
        } catch (error) {
          try { console.error("[ThemeToolkit] native image recolor failed", error); } catch {}
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed native image hook", error); } catch {}
      return null;
    }
  }
  function accentIconElement(kind, color, size = "sm", source = null) {
    let component = null;
    if (kind === "search") component = SearchIconModule?.MagnifyingGlassIcon;
    else if (kind === "notification") {
      const slot = iconSlotForSource(source);
      if (slot === "notificationMuted") component = BellSlashIconModule?.BellSlashIcon;
      else if (slot === "notificationQuiet") component = BellZIconModule?.BellZIcon;
      else if (slot === "notification" || source == null) component = BellIconModule?.BellIcon;
    }
    else if (kind === "settings") component = SettingsIconModule?.SettingsIcon;
    else if (kind === "home") component = HomeIconModule?.HomeIcon ?? ChatIconModule?.ChatIcon;
    if (!component || !color) return null;
    return React.createElement(component, { size, color });
  }
  function buttonIconSize(size) {
    return ["xs", "sm", "md", "lg"].includes(size) ? size : "sm";
  }
  function patchDesignIconButtons() {
    const resolved = componentRenderTarget(DesignIconButtonModule?.IconButton);
    if (!resolved) return null;
    const [target, method] = resolved;
    try {
      return before(method, target, args => {
        try {
          const props = args?.[0];
          if (!props || typeof props !== "object") return;
          const cfg = effectiveUIAccentConfig();
          if (cfg.source === "discord") return;
          const accent = accentForIconSource(props.icon, cfg);
          const color = stripAlpha(accent?.color);
          if (!accent || !["search", "notification", "settings"].includes(accent.kind) || !color) return;
          const icon = accentIconElement(accent.kind, color, buttonIconSize(props.size), props.icon);
          if (!icon) return;
          args[0] = { ...props, icon };
        } catch (error) {
          try { console.error("[ThemeToolkit] design icon button recolor failed", error); } catch {}
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed design icon button hook", error); } catch {}
      return null;
    }
  }
  function wrapSearchRendererElement(element) {
    if (!React.isValidElement(element) || typeof element.type !== "function") return element;
    const original = element.type;
    let wrapper = searchRenderWrappers.get(original);
    if (!wrapper) {
      wrapper = function ThemeToolkitSearchRenderer(props) {
        const rendered = original(props);
        const cfg = effectiveUIAccentConfig();
        const color = cfg.source === "discord" ? null : stripAlpha(cfg.searchIcon);
        return color ? tintSearchTree(rendered, color) : rendered;
      };
      searchRenderWrappers.set(original, wrapper);
    }
    return React.createElement(wrapper, { ...element.props, key: element.key });
  }
  function tintSearchTree(node, color, depth = 0) {
    if (node == null || depth > 24) return node;
    if (Array.isArray(node)) return node.map(child => tintSearchTree(child, color, depth + 1));
    if (!React.isValidElement(node)) return node;
    const name = iconComponentName(node.type);
    if (/SearchButtonContent/i.test(name) && typeof node.type === "function") return wrapSearchRendererElement(node);
    const next = { ...node.props };
    let changed = false;
    if (/MagnifyingGlass|SearchIcon/i.test(name)) {
      next.color = color;
      changed = true;
    }
    if (isSearchSource(next.icon)) {
      const icon = accentIconElement("search", color, buttonIconSize(next.size));
      if (icon) { next.icon = icon; changed = true; }
    }
    if (isSearchSource(next.source)) {
      next.color = color;
      next.tintColor = color;
      next.style = [next.style, { tintColor: color }];
      changed = true;
    }
    if (next.children !== undefined && typeof next.children !== "function") {
      const children = tintSearchTree(next.children, color, depth + 1);
      if (children !== next.children) { next.children = children; changed = true; }
    }
    return changed ? React.cloneElement(node, next) : node;
  }
  function patchGuildSearchContainerRenderer() {
    const resolved = componentRenderTarget(GuildSearchContainerModule?.default);
    if (!resolved) return null;
    const [target, method] = resolved;
    try {
      return after(method, target, (_args, result) => {
        try {
          const cfg = effectiveUIAccentConfig();
          const color = cfg.source === "discord" ? null : stripAlpha(cfg.searchIcon);
          if (!color || !React.isValidElement(result)) return result;
          return typeof result.type === "function" ? wrapSearchRendererElement(result) : tintSearchTree(result, color);
        } catch (error) {
          try { console.error("[ThemeToolkit] guild search container recolor failed", error); } catch {}
          return result;
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed guild search container hook", error); } catch {}
      return null;
    }
  }
  function iconComponentName(component) {
    try {
      return String(component?.displayName ?? component?.name ?? component?.type?.displayName ?? component?.type?.name ?? component?.render?.displayName ?? component?.render?.name ?? "");
    } catch { return ""; }
  }
  function makeTintedIcon(component, color) {
    if (typeof component !== "function") return component;
    return function ThemeToolkitTintedIcon(props) {
      return React.createElement(component, { ...(props ?? {}), color });
    };
  }
  function patchIconActionButtons() {
    if (!IconActionButtonModule || typeof IconActionButtonModule.default !== "function") return null;
    try {
      return after("default", IconActionButtonModule, (args, result) => {
        try {
          const props = args?.[0];
          if (!props || typeof props !== "object" || !result?.props) return result;
          const cfg = effectiveUIAccentConfig();
          if (cfg.source === "discord") return result;
          const name = iconComponentName(props.IconComponent);
          let kind = null;
          if (/MagnifyingGlass|Search/i.test(name) || isSearchSource(props.source)) kind = "search";
          else if (/Bell|Notification/i.test(name) || isNotificationSource(props.source)) kind = "notification";
          else if (/Settings|Gear|Cog/i.test(name) || isSettingsSource(props.source)) kind = "settings";
          if (!kind) return result;
          const color = stripAlpha(kind === "search" ? cfg.searchIcon : kind === "notification" ? cfg.notificationIcon : cfg.settingsIcon);
          const icon = accentIconElement(kind, color, "sm", props.IconComponent ?? props.source);
          if (!icon) return result;
          const children = React.Children.toArray(result.props.children);
          if (!children.length) return result;
          children[0] = icon;
          return React.cloneElement(result, null, ...children);
        } catch (error) {
          try { console.error("[ThemeToolkit] action icon recolor failed", error); } catch {}
          return result;
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed action icon hook", error); } catch {}
      return null;
    }
  }
  function patchLegacyHeaderIcons() {
    if (!LegacyHeaderIconModule || typeof LegacyHeaderIconModule.HeaderIcon !== "function") return null;
    try {
      return after("HeaderIcon", LegacyHeaderIconModule, (args, result) => {
        try {
          const source = args?.[0]?.source;
          const cfg = effectiveUIAccentConfig();
          if (cfg.source === "discord" || !result?.props) return result;
          if (isSearchSource(source)) {
            const color = stripAlpha(cfg.searchIcon);
            if (color) {
              return React.cloneElement(result, { tintColor: color });
            }
          }
          if (isNotificationSource(source)) {
            const color = stripAlpha(cfg.notificationIcon);
            if (color) {
              return React.cloneElement(result, { tintColor: color, color });
            }
          }
          if (isSettingsSource(source)) {
            const color = stripAlpha(cfg.settingsIcon);
            if (color) {
              return React.cloneElement(result, { tintColor: color });
            }
          }
        } catch (error) {
          try { console.error("[ThemeToolkit] legacy header icon recolor failed", error); } catch {}
        }
        return result;
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed legacy header icon hook", error); } catch {}
      return null;
    }
  }
  function patchHeaderIconButtons() {
    if (!HeaderSharedModule || typeof HeaderSharedModule.HeaderIconButton !== "function") return null;
    try {
      return before("HeaderIconButton", HeaderSharedModule, args => {
        try {
          const props = args?.[0];
          if (!props || typeof props !== "object") return;
          const cfg = effectiveUIAccentConfig();
          if (cfg.source === "discord") return;
          if (isSearchSource(props.source)) {
            const color = stripAlpha(cfg.searchIcon);
            if (color) props.color = color;
          } else if (isNotificationSource(props.source)) {
            const color = stripAlpha(cfg.notificationIcon);
            if (color) { props.color = color; props.tintColor = color; }
          } else if (isSettingsSource(props.source)) {
            const color = stripAlpha(cfg.settingsIcon);
            if (color) props.color = color;
          }
        } catch (error) {
          try { console.error("[ThemeToolkit] header icon button recolor failed", error); } catch {}
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed header icon button hook", error); } catch {}
      return null;
    }
  }
  function guildIndicatorVisual(color, selected, key, topOffset = 0) {
    const height = selected ? 40 : 8;
    return React.createElement(RN.View, {
      key,
      pointerEvents: "none",
      collapsable: false,
      style: {
        position: "absolute", left: -4, top: 28 - (height / 2) + topOffset,
        width: 8, height, borderRadius: 4, backgroundColor: color,
      },
    });
  }

  function hideNativeGuildIndicator(result, key) {
    return React.createElement(RN.View, {
      key,
      pointerEvents: "none",
      collapsable: false,
      style: { position: "absolute", opacity: 0 },
    }, result);
  }

  function replacementGuildIndicatorRenderer(renderer, color) {
    let byColor = guildIndicatorRenderWrappers.get(renderer);
    if (!byColor) {
      byColor = new Map();
      guildIndicatorRenderWrappers.set(renderer, byColor);
    }
    let replacement = byColor.get(color);
    if (!replacement) {
      replacement = function ThemeToolkitGuildIndicator(key, item, transitionState, cleanUp) {
        const original = renderer(key, item, transitionState, cleanUp);
        if (item == null) return original;
        return React.createElement(React.Fragment, null,
          hideNativeGuildIndicator(original, "tt-native-guild-indicator-hidden"),
          guildIndicatorVisual(color, !!item.selected, "tt-guild-indicator-colored"),
        );
      };
      byColor.set(color, replacement);
    }
    return replacement;
  }

  function patchGuildWrapperSelectedOverlay() {
    if (!GuildBarWrapperModule || typeof GuildBarWrapperModule.default !== "function") return null;
    try {
      return after("default", GuildBarWrapperModule, (args, result) => {
        try {
          const props = args?.[0] ?? {};
          if (!result?.props) return result;
          const cfg = effectiveUIAccentConfig();
          const color = cfg.source === "discord" ? null : stripAlpha(cfg.selectedGuild);
          if (!color) return result;

          const rootChildren = React.Children.toArray(result.props.children);
          for (let rootIndex = 0; rootIndex < rootChildren.length; rootIndex++) {
            const pressable = rootChildren[rootIndex];
            if (!React.isValidElement(pressable)) continue;
            const pressableChildren = React.Children.toArray(pressable.props?.children);
            const hostIndex = pressableChildren.findIndex(child => React.isValidElement(child)
              && child.props?.pointerEvents === "none"
              && child.props?.collapsable === false
              && child.props?.children != null);
            if (hostIndex < 0) continue;
            const host = pressableChildren[hostIndex];
            const hostChildren = React.Children.toArray(host.props.children);
            const transitionIndex = hostChildren.findIndex(child => React.isValidElement(child)
              && typeof child.props?.renderItem === "function");
            if (transitionIndex < 0) continue;
            const transition = hostChildren[transitionIndex];
            hostChildren[transitionIndex] = React.cloneElement(transition, {
              renderItem: replacementGuildIndicatorRenderer(transition.props.renderItem, color),
            });
            pressableChildren[hostIndex] = React.cloneElement(host, null, ...hostChildren);
            rootChildren[rootIndex] = React.cloneElement(pressable, null, ...pressableChildren);
            return React.cloneElement(result, null, ...rootChildren);
          }

          if (!props.selected && !props.unread) return result;
          rootChildren.push(guildIndicatorVisual(color, !!props.selected, "tt-guild-indicator-fallback", 6));
          return React.cloneElement(result, null, ...rootChildren);
        } catch (error) {
          try { console.error("[ThemeToolkit] guild indicator renderer replacement failed", error); } catch {}
          return result;
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed guild indicator wrapper hook", error); } catch {}
      return null;
    }
  }

  function patchGeneratedIcon(module, method, key) {
    if (!module || typeof module?.[method] !== "function") return null;
    try {
      return before(method, module, args => {
        try {
          const cfg = effectiveUIAccentConfig();
          if (cfg.source === "discord") return;
          const color = stripAlpha(cfg[key]);
          if (color == null) return;
          args[0] = { ...(args[0] ?? {}), color };
        } catch (error) {
          try { console.error(`[ThemeToolkit] ${method} recolor failed`, error); } catch {}
        }
      });
    } catch (error) {
      try { console.error(`[ThemeToolkit] failed to patch ${method}`, error); } catch {}
      return null;
    }
  }

  function patchGuildBarAccent() {
    if (!GuildBarWrapperModule || typeof GuildBarWrapperModule.useGuildsBarAnimatedWrapperStyles !== "function") return null;
    try {
      return after("useGuildsBarAnimatedWrapperStyles", GuildBarWrapperModule, (_args, result) => {
        try {
          const cfg = effectiveUIAccentConfig();
          const color = cfg.source === "discord" ? null : stripAlpha(cfg.selectedGuild);
          if (color != null && result && typeof result === "object") {
            result.itemShapeSelected = [result.itemShapeSelected, { backgroundColor: color }];
            result.unreadIndicator = [result.unreadIndicator, { backgroundColor: color }];
          }
        } catch (error) {
          try { console.error("[ThemeToolkit] selected guild accent failed", error); } catch {}
        }
        return result;
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed to patch selected guild accent", error); } catch {}
      return null;
    }
  }

  function patchSelectedGuildIndicator() {
    if (!GuildBarWrapperModule || typeof GuildBarWrapperModule.renderUnreadIndicator !== "function") return null;
    try {
      return after("renderUnreadIndicator", GuildBarWrapperModule, (args, result) => {
        try {
          const cfg = effectiveUIAccentConfig();
          const color = cfg.source === "discord" ? null : stripAlpha(cfg.selectedGuild);
          if (!color) return result;
          return React.createElement(React.Fragment, null,
            hideNativeGuildIndicator(result, "tt-native-guild-indicator-direct-hidden"),
            guildIndicatorVisual(color, !!args?.[1]?.selected, "tt-guild-indicator-direct"),
          );
        } catch (error) {
          try { console.error("[ThemeToolkit] direct guild indicator replacement failed", error); } catch {}
          return result;
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed selected guild indicator hook", error); } catch {}
      return null;
    }
  }

  function patchGuildBarDirectRenderer() {
    if (!GuildBarGuildModule?.default || typeof GuildBarGuildModule.default !== "function") return null;
    try {
      return after("default", GuildBarGuildModule, (_args, result) => {
        try {
          const cfg = effectiveUIAccentConfig();
          const color = cfg.source === "discord" ? null : stripAlpha(cfg.selectedGuild);
          if (color == null || !result?.props?.styles || typeof result.props.styles !== "object") return result;
          const styles = {
            ...result.props.styles,
            itemShapeSelected: [result.props.styles.itemShapeSelected, { backgroundColor: color }],
          };
          return React.cloneElement(result, { styles });
        } catch (error) {
          try { console.error("[ThemeToolkit] direct selected guild patch failed", error); } catch {}
          return result;
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed direct selected guild patch", error); } catch {}
      return null;
    }
  }

  function patchSearchButtonRenderer() {
    if (!SearchButtonModule || typeof SearchButtonModule.SearchButtonContent !== "function") return null;
    try {
      return after("SearchButtonContent", SearchButtonModule, (_args, result) => {
        try {
          const cfg = effectiveUIAccentConfig();
          const color = cfg.source === "discord" ? null : stripAlpha(cfg.searchIcon);
          if (color == null || !result?.props) return result;
          const children = React.Children.toArray(result.props.children);
          if (!children.length || !React.isValidElement(children[0])) return result;
          children[0] = React.cloneElement(children[0], { color });
          return React.cloneElement(result, null, ...children);
        } catch (error) {
          try { console.error("[ThemeToolkit] direct search button recolor failed", error); } catch {}
          return result;
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed direct search button patch", error); } catch {}
      return null;
    }
  }

  function iconSourceMatches(source, assetId, expectedName) {
    const raw = source?.default ?? source;
    if (assetId != null && raw === assetId) return true;
    if (source?.name === expectedName || raw?.name === expectedName) return true;
    return false;
  }

  function patchBaseIconImageRenderer() {
    if (!BaseIconImageModule || typeof BaseIconImageModule.BaseIconImage !== "function") return null;
    try {
      return before("BaseIconImage", BaseIconImageModule, args => {
        try {
          const props = args?.[0];
          if (!props || typeof props !== "object") return;
          const cfg = effectiveUIAccentConfig();
          if (cfg.source === "discord") return;
          let chosen = null;
          if (iconSourceMatches(props.source, iconAssetIds.home, "HomeIcon")) {
            chosen = cfg.homeIcon;
          } else if (iconSourceMatches(props.source, iconAssetIds.chat, "ChatIcon")) {
            chosen = cfg.homeIcon;
          } else if (iconSourceMatches(props.source, iconAssetIds.search, "MagnifyingGlassIcon") || iconSourceMatches(props.source, iconAssetIds.legacySearch, "SearchIcon")) {
            chosen = cfg.searchIcon;
          } else if (iconSourceMatches(props.source, iconAssetIds.channelSearch, "ChannelListMagnifyingGlassIcon")) {
            chosen = cfg.searchIcon;
          } else if (isNotificationSource(props.source)) {
            chosen = cfg.notificationIcon;
          } else if (iconSourceMatches(props.source, iconAssetIds.settings, "SettingsIcon")) {
            chosen = cfg.settingsIcon;
          }
          const color = stripAlpha(chosen);
          if (color != null) props.color = color;
        } catch (error) {
          try { console.error("[ThemeToolkit] BaseIconImage probe failed", error); } catch {}
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed BaseIconImage probe", error); } catch {}
      return null;
    }
  }

  function toolkitMentionTagGradient(values = storage) {
    return [
      stripAlpha(values.mentionTagGradient1),
      stripAlpha(values.mentionTagGradient2),
      stripAlpha(values.mentionTagGradient3),
    ].filter(Boolean);
  }

  function effectiveMentionTagConfig(values = storage, selectedTheme = currentTheme()) {
    const theme = themeMentionConfig(selectedTheme);
    const requested = values.mentionTagSource;
    if (requested === "toolkit") {
      return {
        source: "toolkit",
        mode: normalizeMentionTagMode(values.mentionTagMode, "solid"),
        color: stripAlpha(values.mentionTagColor),
        gradient: toolkitMentionTagGradient(values),
      };
    }
    if (requested === "theme" && theme.hasTheme) {
      if (theme.tagMode === "gradient" && theme.tagGradient.length >= 2) {
        return { source: "theme", mode: "gradient", color: theme.tagGradient[0], gradient: theme.tagGradient };
      }
      if (theme.tagColor) {
        return { source: "theme", mode: "solid", color: theme.tagColor, gradient: [] };
      }
    }
    return { source: "discord", mode: "solid", color: null, gradient: [] };
  }

  function tagColorInt(value) {
    const hex = stripAlpha(value);
    return hex ? parseInt(hex.slice(1), 16) : null;
  }

  function applyMentionTagStyle(node, cfg = effectiveMentionTagConfig()) {
    if (!node || cfg.source === "discord") return false;
    let colors = [];
    if (cfg.mode === "gradient") colors = (cfg.gradient ?? []).map(stripAlpha).filter(Boolean);
    if (cfg.mode !== "gradient") {
      const color = stripAlpha(cfg.color);
      if (color) colors = [color];
    }
    if (!colors.length || (cfg.mode === "gradient" && colors.length < 2)) return false;

    const oneHex = colors[0];
    const twoHex = colors[1] ?? colors[0];
    const threeHex = colors[2] ?? colors[0];
    const one = tagColorInt(oneHex);
    const two = tagColorInt(twoHex);
    const three = tagColorInt(threeHex);
    if (one == null || two == null || three == null) return false;

    node.color = one;
    node.colorString = oneHex;
    node.roleColor = one;
    node.roleColors = {
      primaryColor: one,
      secondaryColor: two,
      tertiaryColor: three,
    };
    return true;
  }

  function tintMentionTags(value, seen = new Set()) {
    if (value == null || typeof value !== "object") return 0;
    if (seen.has(value)) return 0;
    seen.add(value);

    let hits = 0;
    if (Array.isArray(value)) {
      for (const child of value) hits += tintMentionTags(child, seen);
      return hits;
    }

    if (value.type === "mention") {
      if (applyMentionTagStyle(value)) hits++;
    }

    for (const key of Object.keys(value)) {
      if (key === "parent" || key === "_parent") continue;
      hits += tintMentionTags(value[key], seen);
    }
    return hits;
  }

  function discordFolderColor(folder) {
    const value = folder?.color ?? folder?.folderColor;
    if (value == null) return null;
    try { return colorValue(ColorUtils?.int2hex?.(value)); } catch {}
    return typeof value === "string" ? colorValue(value) : null;
  }
  function customGradient(prefix) {
    return [
      colorValue(storage[`${prefix}Gradient1`]),
      colorValue(storage[`${prefix}Gradient2`]),
      colorValue(storage[`${prefix}Gradient3`]),
    ].filter(Boolean);
  }

  function effectiveOutline(themeOutline, state, hasTheme, values = storage) {
    const storage = values;
    const prefix = state === "open" ? "open" : "closed";
    const requestedMode = storage[`${prefix}OutlineColorMode`];
    let colorMode = requestedMode;
    let color = null;
    let gradient = [];

    if (requestedMode === "theme") {
      if (!hasTheme || themeOutline.enabled === false) return inactiveOutline();
      colorMode = themeOutline.colorMode;
      color = themeOutline.color;
      gradient = themeOutline.gradient ?? [];
    } else if (requestedMode === "custom") {
      colorMode = "solid";
      color = colorValue(storage[`${prefix}OutlineColor`]);
    } else if (["rgb", "rainbow", "spectrum"].includes(requestedMode)) {
      colorMode = requestedMode;
      color = "#FFFFFF";
    } else if (requestedMode === "gradient") {
      colorMode = "gradient";
      gradient = customGradient(prefix);
      color = gradient[0] ?? null;
    } else {
      return inactiveOutline();
    }

    const enabled = !!storage[`${prefix}OutlineEnabled`] && (
      ["rgb", "rainbow", "spectrum"].includes(colorMode)
      || (colorMode === "gradient" && gradient.length >= 2)
      || !!color
    );
    const useTheme = key => storage[`${prefix}${key}`] === "theme";
    return {
      enabled,
      color,
      colorMode,
      gradient,
      pattern: useTheme("OutlinePattern") ? (hasTheme ? themeOutline.pattern : "solid") : normalizePattern(storage[`${prefix}OutlinePattern`], "solid"),
      width: useTheme("OutlineWidth") ? (hasTheme ? themeOutline.width : 1) : normalizeWidth(storage[`${prefix}OutlineWidth`], 1),
      animation: useTheme("OutlineAnimation") ? (hasTheme ? themeOutline.animation : "none") : normalizeAnimation(storage[`${prefix}OutlineAnimation`], "none"),
      speed: useTheme("OutlineSpeed") ? (hasTheme ? themeOutline.speed : "normal") : normalizeSpeed(storage[`${prefix}OutlineSpeed`], "normal"),
      glow: useTheme("OutlineGlow") ? (hasTheme ? themeOutline.glow : 2) : normalizeGlow(storage[`${prefix}OutlineGlow`], 2),
      brightness: storage[`${prefix}OutlineBrightness`] === "theme" ? (hasTheme ? themeOutline.brightness : "normal") : normalizeBrightness(storage[`${prefix}OutlineBrightness`], "normal"),
      trail: storage[`${prefix}OutlineTrail`] === "theme" ? (hasTheme ? themeOutline.trail : "medium") : normalizeTrail(storage[`${prefix}OutlineTrail`], "medium"),
      state,
    };
  }

  function effectiveFolderConfig(folder, state = null) {
    const theme = themeFolderConfig();
    const stateSource = state ? storage[`${state}FolderBackgroundSource`] : "shared";
    const requestedSource = stateSource && stateSource !== "shared" ? stateSource : storage.folderColorSource;
    let source = requestedSource;
    let background = null;
    let accent = null;
    if (requestedSource === "theme") {
      if (theme.hasTheme) { background = (state ? colorValue(currentTheme()?.data?.themeToolkit?.folders?.[state]?.background) : null) ?? theme.background; accent = theme.accent; }
      else source = "discord";
    } else if (requestedSource === "toolkit") {
      background = colorValue(stateSource && stateSource !== "shared" ? storage[`${state}FolderBackground`] : storage.folderBackground);
      accent = colorValue(storage.folderAccent);
    } else source = "discord";

    const cover = storage.folderCoverMode === "theme"
      ? (theme.hasTheme ? theme.cover : "preview")
      : storage.folderCoverMode;
    return {
      source,
      background,
      accent,
      cover: cover === "folder" ? "folder" : "preview",
      coverAccent: accent ?? discordFolderColor(folder) ?? theme.accent ?? "#FFFFFF",
      closedOutline: effectiveOutline(theme.closed, "closed", theme.hasTheme),
      openOutline: effectiveOutline(theme.open, "open", theme.hasTheme),
    };
  }

  function flattened(style) { try { return RN.StyleSheet?.flatten?.(style) ?? {}; } catch { return {}; } }
  function radiusFor(style, fallback) {
    const flat = flattened(style);
    return flat.borderRadius ?? flat.borderTopLeftRadius ?? flat.borderTopRightRadius ?? fallback;
  }
  function speedMs(speed) {
    if (speed === "slow") return 7000;
    if (speed === "fast") return 1600;
    return 3400;
  }
  function sharedPhaseAt(speed, now = Date.now()) {
    const duration = speedMs(speed);
    return (((now - animationEpoch) % duration) + duration) % duration / duration;
  }
  function motionAllowed() {
    return appIsActive && visualSubscribers.size > 0;
  }
  function startMotionEntry(key, entry) {
    if (!entry?.value || entry.stopped || entry.running || !motionAllowed()) return;
    const duration = speedMs(key);
    const start = sharedPhaseAt(key);
    try {
      entry.first?.stop?.();
      entry.loop?.stop?.();
      entry.value?.stopAnimation?.();
      entry.value?.setValue?.(start);
    } catch {}
    entry.running = true;
    entry.paused = false;
    const options = { easing: Easing?.linear, useNativeDriver: true, isInteraction: false };

    const beginLoop = () => {
      if (entry.stopped || !entry.running || !motionAllowed()) return;
      try { entry.value.setValue?.(0); } catch {}
      const loop = Animated.loop(Animated.timing(entry.value, { toValue: 1, duration, ...options }));
      entry.loop = loop;
      try { loop.start(); } catch { entry.running = false; }
    };

    const remaining = Math.max(1, Math.round(duration * (1 - start)));
    const first = Animated.timing(entry.value, { toValue: 1, duration: remaining, ...options });
    entry.first = first;
    try {
      first.start(result => {
        if (entry.stopped || !entry.running) return;
        if (result?.finished === false) return;
        beginLoop();
      });
    } catch {
      beginLoop();
    }
  }
  function getSharedMotionPhase(speed) {
    const key = normalizeSpeed(speed, "normal");
    const existing = motionClocks.get(key);
    if (existing?.value) {
      startMotionEntry(key, existing);
      return existing.value;
    }
    if (!Animated?.Value || !Animated?.timing || !Animated?.loop) return null;

    const value = new Animated.Value(sharedPhaseAt(key));
    const entry = { value, first: null, loop: null, stopped: false, paused: true, running: false };
    motionClocks.set(key, entry);
    startMotionEntry(key, entry);
    return value;
  }
  function pauseSharedMotionClocks() {
    for (const entry of motionClocks.values()) {
      if (!entry.running) continue;
      entry.running = false;
      entry.paused = true;
      try { entry.first?.stop?.(); } catch {}
      try { entry.loop?.stop?.(); } catch {}
      try { entry.value?.stopAnimation?.(); } catch {}
    }
  }
  function resumeSharedMotionClocks() {
    if (!motionAllowed()) return;
    for (const [key, entry] of motionClocks.entries()) startMotionEntry(key, entry);
  }
  function stopSharedMotionClocks() {
    for (const entry of motionClocks.values()) {
      entry.stopped = true;
      entry.running = false;
      try { entry.first?.stop?.(); } catch {}
      try { entry.loop?.stop?.(); } catch {}
      try { entry.value?.stopAnimation?.(); } catch {}
    }
    motionClocks.clear();
  }
  function useColorPhase(enabled, speed, multiplier = 1.45) {
    const [now, setNow] = React.useState(Date.now());
    React.useEffect(() => {
      if (!enabled) return undefined;
      const fn = value => setNow(value);
      colorSubscribers.add(fn);
      if (appIsActive) {
        try { fn(Date.now()); } catch {}
        ensureColorTimer();
      }
      return () => {
        colorSubscribers.delete(fn);
        stopColorTimerIfIdle();
      };
    }, [enabled, speed, multiplier]);
    if (!enabled) return 0;
    const duration = Math.max(1200, Math.round(speedMs(speed) * multiplier));
    return ((((now - animationEpoch) % duration) + duration) % duration) / duration;
  }
  function handleAppStateChange(nextState) {
    const nextActive = nextState === "active";
    if (nextActive === appIsActive) return;
    appIsActive = nextActive;
    if (!appIsActive) {
      stopColorTimer();
      pauseSharedMotionClocks();
      return;
    }
    const now = Date.now();
    for (const fn of [...colorSubscribers]) { try { fn(now); } catch {} }
    ensureColorTimer();
    resumeSharedMotionClocks();
    observeThemeStorage();
    queueThemeRefresh();
  }
  function installAppStateListener() {
    try {
      appIsActive = RN.AppState?.currentState ? RN.AppState.currentState === "active" : true;
      appStateSubscription = RN.AppState?.addEventListener?.("change", handleAppStateChange) ?? null;
    } catch { appStateSubscription = null; }
  }
  function removeAppStateListener() {
    try {
      if (appStateSubscription?.remove) appStateSubscription.remove();
      else RN.AppState?.removeEventListener?.("change", handleAppStateChange);
    } catch {}
    appStateSubscription = null;
  }

  const RGB_RING = ["#FF0000", "#00FF00", "#0000FF", "#FF0000"];
  const RAINBOW_RING = ["#FF0000", "#FF8000", "#FFFF00", "#00FF00", "#00FFFF", "#0080FF", "#4B00FF", "#A000FF", "#FF00FF", "#FF0066", "#FF0000"];
  const FULL_SPECTRUM = [
    "#FF0000", "#FF4000", "#FF8000", "#FFC000", "#FFFF00", "#BFFF00",
    "#80FF00", "#40FF00", "#00FF00", "#00FF40", "#00FF80", "#00FFC0",
    "#00FFFF", "#00BFFF", "#0080FF", "#0040FF", "#0000FF", "#4000FF",
    "#8000FF", "#BF00FF", "#FF00FF", "#FF00BF", "#FF0080", "#FF0040", "#FF0000",
  ];

  function hexRgb(hex) {
    const value = colorValue(hex);
    if (!value) return null;
    const h = value.slice(1, 7);
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  function rgbHex(r, g, b) {
    const part = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
  }
  function gradientAt(colors, t) {
    const valid = colors.map(colorValue).filter(Boolean);
    if (!valid.length) return "#FFFFFF";
    if (valid.length === 1) return valid[0];
    const cycle = [...valid, valid[0]];
    const wrapped = ((t % 1) + 1) % 1;
    const scaled = wrapped * (cycle.length - 1);
    const index = Math.min(cycle.length - 2, Math.floor(scaled));
    const local = scaled - index;
    const a = hexRgb(cycle[index]);
    const b = hexRgb(cycle[index + 1]);
    if (!a || !b) return cycle[index];
    return rgbHex(a.r + (b.r - a.r) * local, a.g + (b.g - a.g) * local, a.b + (b.b - a.b) * local);
  }
  function chasePalette(outline) {
    if (outline.colorMode === "rgb") return RGB_RING.slice(0, -1);
    if (outline.colorMode === "rainbow") return RAINBOW_RING.slice(0, -1);
    if (outline.colorMode === "spectrum") return FULL_SPECTRUM.slice(0, -1);
    if (outline.colorMode === "gradient" && outline.gradient.length >= 2) return outline.gradient;
    return [outline.color ?? "#FFFFFF"];
  }
  function perimeterSegments(pattern, width) {
    const items = [];
    const pushTop = (left, size) => items.push({ top: 0, left, width: size, height: width });
    const pushRight = (top, size) => items.push({ right: 0, top, width, height: size });
    const pushBottom = (right, size) => items.push({ bottom: 0, right, width: size, height: width });
    const pushLeft = (bottom, size) => items.push({ left: 0, bottom, width, height: size });
    if (pattern === "segmented") {
      for (const p of ["8%", "58%"]) pushTop(p, "34%");
      for (const p of ["8%", "58%"]) pushRight(p, "34%");
      for (const p of ["8%", "58%"]) pushBottom(p, "34%");
      for (const p of ["8%", "58%"]) pushLeft(p, "34%");
      return items;
    }
    if (pattern === "dotted") {
      const dot = Math.max(2.4, width * 2.5);
      for (const p of ["8%", "28%", "48%", "68%", "88%"]) items.push({ top: -width * 0.5, left: p, width: dot, height: dot, borderRadius: dot });
      for (const p of ["8%", "28%", "48%", "68%", "88%"]) items.push({ right: -width * 0.5, top: p, width: dot, height: dot, borderRadius: dot });
      for (const p of ["8%", "28%", "48%", "68%", "88%"]) items.push({ bottom: -width * 0.5, right: p, width: dot, height: dot, borderRadius: dot });
      for (const p of ["8%", "28%", "48%", "68%", "88%"]) items.push({ left: -width * 0.5, bottom: p, width: dot, height: dot, borderRadius: dot });
      return items;
    }
    const count = pattern === "dashed" ? 6 : 10;
    const gap = pattern === "dashed" ? 3 : 0;
    const cell = 100 / count;
    const size = Math.max(1, cell - gap);
    for (let i = 0; i < count; i++) { const p = `${i * cell}%`; pushTop(p, `${size}%`); }
    for (let i = 0; i < count; i++) { const p = `${i * cell}%`; pushRight(p, `${size}%`); }
    for (let i = 0; i < count; i++) { const p = `${i * cell}%`; pushBottom(p, `${size}%`); }
    for (let i = 0; i < count; i++) { const p = `${i * cell}%`; pushLeft(p, `${size}%`); }
    return items;
  }
  function marqueeOpacity(phase, index, count) {
    if (!phase?.interpolate || count <= 1) return 1;
    const center = index / count;
    const samples = 32;
    const width = Math.max(0.07, 3.2 / count);
    const inputRange = Array.from({ length: samples + 1 }, (_, i) => i / samples);
    const outputRange = inputRange.map(value => {
      const raw = Math.abs(value - center);
      const distance = Math.min(raw, 1 - raw);
      const x = Math.max(0, 1 - distance / width);
      const smooth = x * x * (3 - 2 * x);
      return 0.10 + 0.90 * smooth;
    });
    try { return phase.interpolate({ inputRange, outputRange, extrapolate: "clamp" }); } catch { return 1; }
  }

  function roundedRectPoint(t, width, height, radius) {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    const straightW = Math.max(0, w - 2 * r);
    const straightH = Math.max(0, h - 2 * r);
    const arc = Math.PI * r / 2;
    const total = Math.max(1, 2 * straightW + 2 * straightH + 4 * arc);
    let d = (((t % 1) + 1) % 1) * total;
    if (d <= straightW) return { x: r + d, y: 0 };
    d -= straightW;
    if (d <= arc && r > 0) { const a = -Math.PI / 2 + (d / arc) * Math.PI / 2; return { x: w - r + Math.cos(a) * r, y: r + Math.sin(a) * r }; }
    d -= arc;
    if (d <= straightH) return { x: w, y: r + d };
    d -= straightH;
    if (d <= arc && r > 0) { const a = (d / arc) * Math.PI / 2; return { x: w - r + Math.cos(a) * r, y: h - r + Math.sin(a) * r }; }
    d -= arc;
    if (d <= straightW) return { x: w - r - d, y: h };
    d -= straightW;
    if (d <= arc && r > 0) { const a = Math.PI / 2 + (d / arc) * Math.PI / 2; return { x: r + Math.cos(a) * r, y: h - r + Math.sin(a) * r }; }
    d -= arc;
    if (d <= straightH) return { x: 0, y: h - r - d };
    d -= straightH;
    if (r > 0) { const a = Math.PI + (d / Math.max(arc, 0.0001)) * Math.PI / 2; return { x: r + Math.cos(a) * r, y: r + Math.sin(a) * r }; }
    return { x: 0, y: 0 };
  }
  function roundedRectPerimeter(width, height, radius) {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    return Math.max(1, 2 * Math.max(0, w - 2 * r) + 2 * Math.max(0, h - 2 * r) + 2 * Math.PI * r);
  }
  const PATH_SAMPLES = 64;
  const PATH_INPUT_RANGE = Array.from({ length: PATH_SAMPLES + 1 }, (_, i) => i / PATH_SAMPLES);
  function unwrapAngles(values) {
    if (!values.length) return values;
    const out = [values[0]];
    for (let i = 1; i < values.length; i++) {
      let value = values[i];
      const prev = out[i - 1];
      while (value - prev > 180) value -= 360;
      while (value - prev < -180) value += 360;
      out.push(value);
    }
    return out;
  }
  function pathGeometry(width, height, radius, offset) {
    const key = `${Math.round(width * 2) / 2}|${Math.round(height * 2) / 2}|${Math.round(radius * 2) / 2}|${offset.toFixed(4)}`;
    const cached = pathGeometryCache.get(key);
    if (cached) return cached;
    const points = PATH_INPUT_RANGE.map(t => roundedRectPoint(t - offset, width, height, radius));
    const epsilon = 1 / (PATH_SAMPLES * 4);
    const rawAngles = PATH_INPUT_RANGE.map(t => {
      const a = roundedRectPoint(t - offset, width, height, radius);
      const b = roundedRectPoint(t - offset + epsilon, width, height, radius);
      return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    });
    const angles = unwrapAngles(rawAngles);
    const geometry = {
      inputRange: PATH_INPUT_RANGE,
      x: points.map(p => p.x),
      y: points.map(p => p.y),
      angle: angles.map(value => `${value}deg`),
    };
    if (pathGeometryCache.size > 700) pathGeometryCache.clear();
    pathGeometryCache.set(key, geometry);
    return geometry;
  }
  function pathTransform(phase, width, height, radius, offset) {
    const geometry = pathGeometry(width, height, radius, offset);
    try {
      return {
        x: phase.interpolate({ inputRange: geometry.inputRange, outputRange: geometry.x, extrapolate: "clamp" }),
        y: phase.interpolate({ inputRange: geometry.inputRange, outputRange: geometry.y, extrapolate: "clamp" }),
        rotate: phase.interpolate({ inputRange: geometry.inputRange, outputRange: geometry.angle, extrapolate: "clamp" }),
      };
    } catch { return { x: 0, y: 0, rotate: "0deg" }; }
  }
  function trailSpan(trail) {
    if (trail === "short") return 0.25;
    if (trail === "long") return 0.85;
    return 0.50;
  }
  function trailCount(trail, width, height, radius, dot, pattern, state) {
    if (state === "closed" && pattern === "dotted") {
      if (trail === "short") return 4;
      if (trail === "long") return 10;
      return 7;
    }
    if (state === "closed" && pattern === "solid") {
      if (trail === "short") return 14;
      if (trail === "long") return 34;
      return 22;
    }
    const minimum = trail === "short" ? 9 : trail === "long" ? 24 : 16;
    if (!(width > 0) || !(height > 0)) return minimum;
    const span = trailSpan(trail);
    const perimeter = roundedRectPerimeter(width, height, radius);
    const spacingFactor = pattern === "solid" ? 0.80 : pattern === "dotted" ? 1.45 : 1.05;
    const spacing = Math.max(1.8, dot * spacingFactor);
    const desired = Math.ceil((perimeter * span) / spacing) + 1;
    const maximum = pattern === "solid" ? 72 : 56;
    return Math.max(minimum, Math.min(maximum, desired));
  }

  function MovingCapsule({ motionPhase, width, height, radius, offset, length, thickness, color, opacity = 1, glow = 0, glowOpacity = 0, head = false, crossScale = 1 }) {
    const motion = React.useMemo(
      () => pathTransform(motionPhase, width, height, radius, offset),
      [motionPhase, width, height, radius, offset],
    );
    const Wrapper = Animated?.View ?? RN.View;
    const bodyLength = head ? thickness : Math.max(thickness, length);
    const transforms = [
      { translateX: motion.x },
      { translateY: motion.y },
      ...(head ? [] : [{ rotate: motion.rotate }]),
      ...(head ? [{ scale: crossScale }] : [{ scaleY: crossScale }]),
    ];
    return React.createElement(Wrapper, {
      pointerEvents: "none",
      style: {
        position: "absolute",
        left: -bodyLength / 2,
        top: -thickness / 2,
        width: bodyLength,
        height: thickness,
        borderRadius: thickness,
        backgroundColor: color,
        opacity,
        transform: transforms,
      },
    },
      glowOpacity > 0 ? React.createElement(RN.View, {
        pointerEvents: "none",
        style: {
          position: "absolute", top: -glow, left: -glow, right: -glow, bottom: -glow,
          borderRadius: thickness + glow * 2, backgroundColor: color, opacity: glowOpacity,
        },
      }) : null,
      head ? React.createElement(RN.View, {
        pointerEvents: "none",
        style: {
          position: "absolute", top: thickness * 0.34, left: thickness * 0.34,
          width: thickness * 0.32, height: thickness * 0.32, borderRadius: thickness,
          backgroundColor: "#FFFFFF", opacity: 0.8,
        },
      }) : null,
    );
  }

  function ChaseVisual({ outline, baseStyle, fallbackRadius }) {
    const flat = flattened(baseStyle);
    const initialWidth = Number.isFinite(Number(flat.width)) ? Number(flat.width) : 0;
    const initialHeight = Number.isFinite(Number(flat.height)) ? Number(flat.height) : 0;
    const [size, setSize] = React.useState({ width: initialWidth, height: initialHeight });
    const motionPhase = getSharedMotionPhase(outline.speed);
    const palette = chasePalette(outline);
    const dynamicColor = palette.length > 1;
    const colorPhase = useColorPhase(dynamicColor, outline.speed);
    const chaseColor = dynamicColor ? gradientAt(palette, colorPhase) : (palette[0] ?? "#FFFFFF");

    const radius = Math.max(0, Math.min(radiusFor(baseStyle, fallbackRadius), size.width / 2 || fallbackRadius, size.height / 2 || fallbackRadius));
    const dot = Math.max(4.8, outline.width * 2.7);
    const span = trailSpan(outline.trail);
    const count = trailCount(outline.trail, size.width, size.height, radius, dot, outline.pattern, outline.state);
    const perimeter = roundedRectPerimeter(size.width || 1, size.height || 1, radius);
    const pathSpacing = count > 1 ? (perimeter * span) / (count - 1) : dot;
    const compactSolid = outline.state === "closed" && outline.pattern === "solid";
    const compactThickness = Math.max(2.4, outline.width * 1.45);
    const solidLength = compactSolid
      ? Math.max(compactThickness * 1.8, pathSpacing * 2.45)
      : Math.max(dot * 0.95, pathSpacing * 1.24);
    const baseOpacity = outline.brightness === "max" ? 0.14 : outline.brightness === "bright" ? 0.09 : 0.05;
    const glowFactor = outline.glow === 3 ? 1.28 : outline.glow === 1 ? 0.76 : 1;
    const headHalo = (outline.brightness === "max" ? 8 : outline.brightness === "bright" ? 6 : 4) * glowFactor;
    const dots = [];

    if (size.width > 0 && size.height > 0 && motionPhase) {
      for (let i = count - 1; i >= 0; i--) {
        const frac = count <= 1 ? 0 : i / (count - 1);
        const offset = frac * span;
        const opacity = i === 0 ? 1 : Math.max(0.12, Math.pow(1 - frac, 0.88) * 0.92);
        const minScale = outline.pattern === "solid" ? 0.74 : 0.42;
        const scale = i === 0 ? 1.58 : compactSolid ? 1 : Math.max(minScale, 1 - frac * (outline.pattern === "solid" ? 0.26 : 0.55));
        const halo = i === 0 ? headHalo : Math.max(0.7, headHalo * (1 - frac) * 0.46);
        const haloOpacity = i === 0 ? 0.54 : compactSolid ? 0 : (frac < 0.74 ? Math.max(0.04, 0.20 * (1 - frac)) : 0);
        const thickness = i === 0 ? dot : compactSolid ? compactThickness : dot;
        dots.push(React.createElement(MovingCapsule, {
          key: `tt-chase-${i}`,
          motionPhase,
          width: size.width,
          height: size.height,
          radius,
          offset,
          length: outline.pattern === "solid" && i !== 0 ? solidLength : dot,
          thickness,
          opacity,
          crossScale: scale,
          color: chaseColor,
          glow: halo,
          glowOpacity: haloOpacity,
          head: i === 0,
        }));
      }
    }

    return React.createElement(RN.View, {
      pointerEvents: "none",
      onLayout(event) {
        const width = Number(event?.nativeEvent?.layout?.width) || 0;
        const height = Number(event?.nativeEvent?.layout?.height) || 0;
        if (width > 0 && height > 0 && (Math.abs(width - size.width) > 0.5 || Math.abs(height - size.height) > 0.5)) setSize({ width, height });
      },
      style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "visible" },
    },
      React.createElement(RN.View, {
        pointerEvents: "none",
        style: {
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: radiusFor(baseStyle, fallbackRadius),
          borderWidth: outline.width,
          borderColor: chaseColor,
          borderStyle: outline.pattern === "segmented" ? "solid" : outline.pattern,
          opacity: baseOpacity,
        },
      }),
      dots,
    );
  }

  function FlowVisual({ outline, baseStyle, fallbackRadius, mode }) {
    const flat = flattened(baseStyle);
    const initialWidth = Number.isFinite(Number(flat.width)) ? Number(flat.width) : 0;
    const initialHeight = Number.isFinite(Number(flat.height)) ? Number(flat.height) : 0;
    const [size, setSize] = React.useState({ width: initialWidth, height: initialHeight });
    const motionPhase = getSharedMotionPhase(outline.speed);
    const radius = Math.max(0, Math.min(radiusFor(baseStyle, fallbackRadius), size.width / 2 || fallbackRadius, size.height / 2 || fallbackRadius));
    const perimeter = roundedRectPerimeter(size.width || 1, size.height || 1, radius);
    const count = Math.max(28, Math.min(mode === "spin" ? 64 : 54, Math.ceil(perimeter / (mode === "spin" ? 7.5 : 9.0))));
    const spacing = perimeter / count;
    const thickness = Math.max(3.4, outline.width * 1.75);
    const length = Math.max(thickness, spacing * 1.26);
    const palette = chasePalette(outline);
    const baseColor = palette[0] ?? outline.color ?? "#FFFFFF";
    const brightnessBoost = outline.brightness === "max" ? 1 : outline.brightness === "bright" ? 0.92 : 0.78;
    const elements = [];

    if (size.width > 0 && size.height > 0 && motionPhase) {
      for (let i = 0; i < count; i++) {
        const fraction = i / count;
        const color = mode === "spin" && palette.length > 1
          ? gradientAt(palette, fraction)
          : palette.length > 1 ? gradientAt(palette, fraction) : baseColor;
        let opacity = brightnessBoost;
        if (mode === "marquee") {
          const raw = Math.min(fraction, 1 - fraction);
          const x = Math.max(0, 1 - raw / 0.16);
          const smooth = x * x * (3 - 2 * x);
          opacity = 0.10 + 0.90 * smooth;
        }
        elements.push(React.createElement(MovingCapsule, {
          key: `tt-${mode}-${i}`,
          motionPhase,
          width: size.width,
          height: size.height,
          radius,
          offset: fraction,
          length,
          thickness,
          color,
          opacity,
          crossScale: 1,
          glow: outline.glow === 3 ? 1.8 : outline.glow === 1 ? 0.6 : 1.1,
          glowOpacity: mode === "marquee" ? opacity * 0.12 : 0.07,
          head: false,
        }));
      }
    }

    return React.createElement(RN.View, {
      pointerEvents: "none",
      onLayout(event) {
        const width = Number(event?.nativeEvent?.layout?.width) || 0;
        const height = Number(event?.nativeEvent?.layout?.height) || 0;
        if (width > 0 && height > 0 && (Math.abs(width - size.width) > 0.5 || Math.abs(height - size.height) > 0.5)) setSize({ width, height });
      },
      style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "visible" },
    },
      React.createElement(RN.View, {
        pointerEvents: "none",
        style: {
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: radiusFor(baseStyle, fallbackRadius), borderWidth: outline.width,
          borderColor: baseColor, opacity: mode === "marquee" ? 0.10 : 0.05,
        },
      }),
      elements,
    );
  }

  function brightnessHalo(outline, color, radius, phase) {
    if (outline.brightness === "normal" && outline.animation !== "glow") return null;
    const maxMode = outline.brightness === "max";
    const glowFactor = outline.glow === 3 ? 1.35 : outline.glow === 1 ? 0.72 : 1;
    const extra = (maxMode ? 4 : 2) * glowFactor;
    let opacity = (maxMode ? 0.46 : 0.26) * Math.min(1.2, glowFactor);
    if (outline.animation === "glow" && phase?.interpolate) {
      opacity = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: maxMode ? [0.22, 0.72, 0.22] : [0.12, 0.52, 0.12] });
    }
    const Wrapper = Animated?.View ?? RN.View;
    return React.createElement(Wrapper, {
      key: "brightness-halo", pointerEvents: "none",
      style: { position: "absolute", top: -extra, left: -extra, right: -extra, bottom: -extra, borderRadius: radius + extra, borderWidth: outline.width + extra, borderColor: color, opacity },
    });
  }

  function AnimatedOutlineVisual({ outline, baseStyle, fallbackRadius }) {
    const radius = radiusFor(baseStyle, fallbackRadius);
    const dynamicColor = ["rgb", "rainbow", "spectrum"].includes(outline.colorMode);
    const spinningGradient = outline.colorMode === "gradient" && outline.animation === "spin";
    const colorPhase = useColorPhase(dynamicColor || spinningGradient, outline.speed);
    const needsMotion = ["pulse", "breathe", "glow", "marquee"].includes(outline.animation);
    const phase = needsMotion ? getSharedMotionPhase(outline.speed) : null;

    const modeColors = outline.colorMode === "rgb" ? RGB_RING
      : outline.colorMode === "rainbow" ? RAINBOW_RING
      : outline.colorMode === "spectrum" ? FULL_SPECTRUM
      : outline.gradient;
    const baseColor = dynamicColor ? gradientAt(modeColors, colorPhase)
      : spinningGradient ? gradientAt(outline.gradient, colorPhase)
      : outline.colorMode === "gradient" ? gradientAt(outline.gradient, 0)
      : outline.color;

    let opacity = 1;
    let scale = 1;
    if (phase?.interpolate && outline.animation === "pulse") {
      opacity = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.58, 1] });
      scale = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.045, 1] });
    } else if (phase?.interpolate && outline.animation === "breathe") {
      opacity = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.52, 1, 0.52] });
    }
    const Wrapper = Animated?.View ?? RN.View;
    const containerStyle = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius, opacity, transform: [{ scale }] };
    const needsSegments = ["rgb", "rainbow", "gradient"].includes(outline.colorMode)
      || outline.pattern === "segmented" || outline.animation === "marquee" || outline.animation === "spin";
    if (!needsSegments) {
      return React.createElement(Wrapper, { pointerEvents: "none", style: containerStyle },
        brightnessHalo(outline, baseColor, radius, phase),
        React.createElement(Wrapper, {
          pointerEvents: "none",
          style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius, borderWidth: outline.width, borderColor: baseColor, borderStyle: outline.pattern },
        }),
      );
    }
    const segments = perimeterSegments(outline.pattern, outline.width);
    return React.createElement(Wrapper, { pointerEvents: "none", style: containerStyle },
      brightnessHalo(outline, baseColor, radius, phase),
      segments.map((style, index) => {
        const offset = index / Math.max(1, segments.length);
        let segmentColor = baseColor;
        if (outline.colorMode === "rgb" || outline.colorMode === "rainbow") {
          segmentColor = gradientAt(modeColors, colorPhase + offset);
        } else if (outline.colorMode === "spectrum") {
          segmentColor = baseColor;
        } else if (outline.colorMode === "gradient") {
          segmentColor = gradientAt(modeColors, (spinningGradient ? colorPhase : 0) + offset);
        }
        const segmentOpacity = outline.animation === "marquee" ? marqueeOpacity(phase, index, segments.length) : 1;
        return React.createElement(Wrapper, {
          key: `tt-seg-${index}`, pointerEvents: "none",
          style: [{ position: "absolute", backgroundColor: segmentColor, opacity: segmentOpacity, borderRadius: style.borderRadius ?? Math.max(1, outline.width) }, style],
        });
      }),
    );
  }

  function OutlineVisual({ folder, state, baseStyle, fallbackRadius, outlineOverride }) {
    useToolkitRevision();
    if (!folderVisualsActive) return null;
    const cfg = effectiveFolderConfig(folder);
    const outline = outlineOverride ?? (state === "open" ? cfg.openOutline : cfg.closedOutline);
    if (!outline?.enabled) return null;
    if (outline.animation === "chase") return React.createElement(ChaseVisual, { outline, baseStyle, fallbackRadius });
    if (outline.pattern === "solid" && outline.animation === "marquee") {
      return React.createElement(FlowVisual, { outline, baseStyle, fallbackRadius, mode: "marquee" });
    }
    if (outline.pattern === "solid" && outline.animation === "spin" && chasePalette(outline).length > 1) {
      return React.createElement(FlowVisual, { outline, baseStyle, fallbackRadius, mode: "spin" });
    }
    return React.createElement(AnimatedOutlineVisual, { outline, baseStyle, fallbackRadius });
  }

  function FolderSurface({ folder, element, state, fallbackRadius }) {
    useToolkitRevision();
    if (!folderVisualsActive) return element;
    const cfg = effectiveFolderConfig(folder, state);
    const diagnostic = folderSurfaceStats[state];
    if (diagnostic) {
      diagnostic.renders++;
      rememberFolderLayout(diagnostic.surfaces, element);
      const outline = state === "open" ? cfg.openOutline : cfg.closedOutline;
      diagnostic.last = { source: cfg.source, background: cfg.background, outline: outline.enabled, color: outline.color, width: outline.width };
    }
    const baseStyle = element.props.style;
    let style = baseStyle;
    if (cfg.source !== "discord" && cfg.background) {
      // Replace the native fill: a transparent overlay leaves that fill visible.
      const override = { backgroundColor: cfg.background };
      style = typeof baseStyle === "function"
        ? (...args) => [baseStyle(...args), override]
        : [baseStyle, override];
    }
    // Discord's empty preview-background view has opacity 0.4. Its sibling
    // server previews are separate. Do not dim a new outline with that fill.
    if (state === "closed" && element.props.children == null && typeof baseStyle !== "function") {
      const flat = flattened(baseStyle);
      const customFill = cfg.source !== "discord" && cfg.background;
      const fill = customFill || colorValue(flat.backgroundColor);
      if ((customFill || cfg.closedOutline.enabled) && fill && flat.position === "absolute"
        && typeof flat.opacity === "number" && flat.opacity >= 0 && flat.opacity < 1) {
        style = [baseStyle, { opacity: 1,
          backgroundColor: customFill || withAlpha(fill, colorAlpha(fill) * flat.opacity) }];
      }
    }
    const outline = React.createElement(OutlineVisual, {
      key: `tt-${state}-outline`, folder, state, baseStyle, fallbackRadius,
    });
    return React.cloneElement(element, { style }, appendVisuals(element.props.children, outline));
  }
  function appendVisuals(existing, outline) {
    const children = [];
    if (Array.isArray(existing)) children.push(...existing);
    else if (existing != null) children.push(existing);
    if (outline) children.push(outline);
    return children;
  }

  function replaceReactChild(element, target, replacement) {
    if (element === target) return replacement;
    if (Array.isArray(element)) {
      const children = element.map(child => replaceReactChild(child, target, replacement));
      return children.some((child, index) => child !== element[index]) ? children : element;
    }
    if (!element?.props?.children) return element;
    const children = replaceReactChild(element.props.children, target, replacement);
    return children === element.props.children ? element : React.cloneElement(element, null, children);
  }

  function FolderTransition({ element, folder, expanded }) {
    useToolkitRevision();
    if (!folderVisualsActive) return element;
    const cfg = effectiveFolderConfig(folder);
    const state = expanded ? "open" : "closed";
    let items = element.props.items;
    if (!expanded && cfg.cover === "folder") {
      items = [{ ...items[0], type: "icon", tintStyle: { tintColor: cfg.coverAccent } }];
    } else if (cfg.source !== "discord" && cfg.accent) {
      items = items.map(item => item.type === "icon"
        ? { ...item, tintStyle: [item.tintStyle, { tintColor: cfg.accent }] } : item);
    }
    let wrapChildren = element.props.wrapChildren;
    if (typeof wrapChildren === "function") {
      const originalWrap = wrapChildren;
      wrapChildren = function (...args) {
        const wrapped = originalWrap.apply(this, args);
        const diagnostic = folderSurfaceStats[state];
        diagnostic.wrapCalls++;
        rememberFolderLayout(diagnostic.wrappers, wrapped);
        if (expanded) return wrapped;
        try {
          const children = wrapped?.props?.children;
          const tile = Array.isArray(children) ? children[0] : children;
          if (tile?.props) {
            diagnostic.attached++;
            const surface = React.createElement(FolderSurface, {
              key: tile.key ?? "tt-closed-surface", folder, element: tile, state: "closed", fallbackRadius: 16,
            });
            return React.cloneElement(wrapped, null, Array.isArray(children) ? [surface, ...children.slice(1)] : surface);
          }
        } catch (error) { try { console.error("[ThemeToolkit] collapsed visual failed", error); } catch {} }
        return wrapped;
      };
    }
    let renderItem = element.props.renderItem;
    folderRendererStats.renderItem = typeof renderItem === "function";
    if (typeof renderItem === "function") {
      const originalRender = renderItem;
      renderItem = function (...args) {
        const rendered = originalRender.apply(this, args);
        folderRendererStats.callbacks++;
        folderRendererStats.arguments = args.map(arg => arg && typeof arg === "object"
          ? `object(${Object.keys(arg).slice(0, 6).join(",")})` : typeof arg).join("; ").slice(0, 200);
        const item = args.find(arg => arg?.type === "icon" || arg?.type === "preview");
        if (item?.type !== "icon") return rendered;
        folderRendererStats.iconItems++;
        return React.createElement(FolderItemArtwork, { key: rendered?.key, fallback: rendered, folder, state });
      };
    }
    const transition = React.cloneElement(element, {
      items, wrapChildren, ...(typeof renderItem === "function" ? { renderItem } : {}),
    });
    return FolderIconContext
      ? React.createElement(FolderIconContext.Provider, { value: { folder, state } }, transition)
      : transition;
  }

  function wrapFolderTree(arg, result, route) {
    if (!folderVisualsActive || !findInReactTree) return result;
    try {
      // Both the parent hook and the JSX hook can see a new folder. Wrap once.
      if (findInReactTree(result, node => node?.type === FolderTransition)) return result;
      let folder = arg?.folder ?? arg;
      if (arg?.id && !arg?.folder) {
        try { folder = FolderStore?.getGuildFolderById?.(arg.id) ?? arg; } catch {}
      }
      const transition = findInReactTree(result, node => Array.isArray(node?.props?.items)
        && node.props.items.length > 0
        && typeof node?.props?.wrapChildren === "function"
        && (node.props.items[0]?.type === "preview" || node.props.items[0]?.type === "icon"));
      if (!transition?.props) {
        if (route === "parent") {
          folderSurfaceStats.transitionMisses++;
          rememberFolderLayout(folderSurfaceStats.unmatchedLayouts, result);
        }
        return result;
      }
      const item = transition.props.items[0];
      const expanded = typeof arg?.expanded === "boolean" ? arg.expanded
        : typeof folder?.expanded === "boolean" ? folder.expanded : item.type === "icon";
      const state = expanded ? "open" : "closed";
      if (route === "jsx") folderSurfaceStats.jsx.matches++;
      folderSurfaceStats[state].transitions++;
      rememberFolderLayout(folderSurfaceStats[state].parents, result);
      rememberFolderSample(folderSurfaceStats.decisions, {
        state, route, itemTypes: transition.props.items.slice(0, 8).map(item => ["icon", "preview"].includes(item?.type) ? item.type : "other"),
        argumentKeys: Object.keys(arg ?? {}).slice(0, 16), folderKeys: Object.keys(folder ?? {}).slice(0, 16),
        argumentExpanded: typeof arg?.expanded === "boolean" ? arg.expanded : "absent",
        folderExpanded: typeof folder?.expanded === "boolean" ? folder.expanded : "absent",
      });
      return replaceReactChild(result, transition, React.createElement(FolderTransition, {
        key: transition.key, element: transition, folder, expanded,
      }));
    } catch (error) { try { console.error("[ThemeToolkit] folder render patch failed", error); } catch {} }
    return result;
  }
  function patchFolderJSX() {
    try {
      const api = globalThis?.bunny ?? globalThis?.window?.bunny;
      const jsx = api?.api?.react?.jsx;
      const component = GuildBarWrapperModule?.default;
      if (!findInReactTree || typeof component !== "function" || !component.name
        || typeof jsx?.onJsxCreate !== "function" || typeof jsx?.deleteJsxCreate !== "function") return null;
      // Revenge's existing JSX dispatcher remains reachable from Discord's
      // captured JSX functions. Changing a mounted memo's .type does not.
      const callback = (type, element) => {
        if (!folderVisualsActive || (type !== component && type !== GuildBarWrapperModule.default)) return element;
        folderSurfaceStats.jsx.callbacks++;
        // The shared wrapper also renders ordinary server buttons. Only folders
        // have an explicit expanded state and the icon/preview transition tree.
        if (typeof element?.props?.expanded !== "boolean") return element;
        return wrapFolderTree(element.props, element, "jsx");
      };
      jsx.onJsxCreate(component.name, callback);
      folderSurfaceStats.jsx.installed = true;
      folderSurfaceStats.jsx.component = component.name;
      return () => {
        jsx.deleteJsxCreate(component.name, callback);
        folderSurfaceStats.jsx.installed = false;
      };
    } catch (error) { try { console.error("[ThemeToolkit] failed folder JSX hook", error); } catch {} return null; }
  }
  function patchFolderRenderer() {
    if (!GuildFolderModule || !findInReactTree) return null;
    const memo = GuildFolderModule.default;
    const target = memo?.type ? memo : GuildFolderModule;
    const method = memo?.type ? "type" : "default";
    if (typeof target?.[method] !== "function") return null;
    try {
      return after(method, target, (args, result) => {
        folderSurfaceStats.parentRenders++;
        return wrapFolderTree(args?.[0], result, "parent");
      });
    } catch (error) { try { console.error("[ThemeToolkit] failed to patch folder renderer", error); } catch {} return null; }
  }

  function patchExpandedFolderBackground() {
    const memo = GuildFolderModule?.GuildsBarGuildFolderBG;
    if (!memo) return null;
    const target = memo?.type ? memo : GuildFolderModule;
    const method = memo?.type ? "type" : "GuildsBarGuildFolderBG";
    if (typeof target?.[method] !== "function") return null;
    try {
      return after(method, target, (args, result) => {
        try {
          const folderId = args?.[0]?.folderId;
          let folder = null;
          try { folder = FolderStore?.getGuildFolderById?.(folderId) ?? null; } catch {}
          if (result?.props) {
            folderSurfaceStats.open.attached++;
            result = React.createElement(FolderSurface, {
              key: result.key ?? "tt-open-surface", folder, element: result, state: "open", fallbackRadius: 18,
            });
          }
        } catch (error) { try { console.error("[ThemeToolkit] expanded folder visual failed", error); } catch {} }
        return result;
      });
    } catch (error) { try { console.error("[ThemeToolkit] failed to patch expanded folder background", error); } catch {} return null; }
  }

  function patchChannelUnreadIndicators() {
    if (!BaseChannelItemModule || typeof BaseChannelItemModule.default !== "function" || !findInReactTree) return null;
    try {
      return after("default", BaseChannelItemModule, (_args, result) => {
        if (!ChannelUnreadIndicatorModule) {
          try { useToolkitRevision(); } catch {}
        }
        try {
          const cfg = effectiveUIAccentConfig();
          const color = cfg.source === "discord" ? null : stripAlpha(cfg.selectedGuild);
          if (!color) return result;
          const indicator = findInReactTree(result, node => node?.props?.unread === true
            && node.props?.resolvedUnreadSetting != null
            && node.props?.style != null);
          if (indicator?.props) indicator.props.style = [indicator.props.style, { backgroundColor: color }];
        } catch (error) {
          try { console.error("[ThemeToolkit] channel unread recolor failed", error); } catch {}
        }
        return result;
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed channel unread hook", error); } catch {}
      return null;
    }
  }

  function patchDirectChannelUnreadIndicator() {
    if (!ChannelUnreadIndicatorModule || typeof ChannelUnreadIndicatorModule.default !== "function") return null;
    try {
      return before("default", ChannelUnreadIndicatorModule, args => {
        try { useToolkitRevision(); } catch {}
        try {
          const props = args?.[0];
          if (!props || props.unread !== true) return;
          const cfg = effectiveUIAccentConfig();
          const color = cfg.source === "discord" ? null : stripAlpha(cfg.selectedGuild);
          if (!color) return;
          args[0] = { ...props, style: [props.style, { backgroundColor: color }] };
        } catch (error) {
          try { console.error("[ThemeToolkit] direct channel unread recolor failed", error); } catch {}
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed direct channel unread hook", error); } catch {}
      return null;
    }
  }

  function patchMessageRowManager() {
    if (!UseRowManagerModule || typeof UseRowManagerModule.default !== "function") return null;
    try {
      return after("default", UseRowManagerModule, (args, result) => {
        try {
          if (typeof result?.updateRows !== "function") return result;
          const channelId = args?.[0]?.channelId ?? args?.[0]?.channel?.id ?? selectedChannelId();
          if (!channelId) return result;
          const key = String(channelId);
          const refresh = () => result.updateRows({ forceRender: true, forceReload: true });
          messageRowRefreshers.set(key, refresh);
          while (messageRowRefreshers.size > 24) messageRowRefreshers.delete(messageRowRefreshers.keys().next().value);
          if (messageRowAppliedRevisions.get(key) !== toolkitAppearanceRevision) {
            for (const delay of [0, 200, 600]) {
              setTimeout(() => {
                if (messageRowRefreshers.get(key) !== refresh) return;
                if (String(selectedChannelId() ?? "") !== key) return;
                refreshCurrentMessageRows();
              }, delay);
            }
          }
        } catch (error) {
          try { console.error("[ThemeToolkit] message row manager capture failed", error); } catch {}
        }
        return result;
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed message row manager hook", error); } catch {}
      return null;
    }
  }

  function patchMentionTags() {
    if (!MarkupParsers || typeof MarkupParsers.parseMessageMarkup !== "function") return null;
    try {
      return after("parseMessageMarkup", MarkupParsers, (_args, result) => {
        try {
          tintMentionTags(result?.content);
        } catch (error) {
          try { console.error("[ThemeToolkit] inline mention tag patch failed", error); } catch {}
        }
        return result;
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed to patch inline mention tags", error); } catch {}
      return null;
    }
  }

  function patchMentionHighlights() {
    if (typeof MessageRowGenerator?.generateMessageRowData !== "function") return null;
    try {
      return after("generateMessageRowData", MessageRowGenerator, (args, result) => {
        try {
          if (!result) return result;
          const ui = effectiveUIAccentConfig();
          if (ui.source !== "discord" && ui.reaction) {
            const reaction = nativeColor(ui.reaction);
            const reactionText = nativeColor(autoContrastText(ui.reaction) ?? "#000000");
            if (reaction != null) {
              const existingReactionTheme = result.reactionsTheme && typeof result.reactionsTheme === "object" ? result.reactionsTheme : {};
              result.reactionsTheme = {
                ...existingReactionTheme,
                activeReactionBackgroundColor: reaction,
                activeReactionBorderColor: reaction,
                ...(reactionText != null ? { activeReactionTextColor: reactionText } : {}),
              };
            }
          }

          const message = args?.[0]?.message;
          if (!message?.mentioned) return result;
          const cfg = effectiveMentionConfig();
          const existing = result.backgroundHighlight ?? {};
          const next = { ...existing };
          let highlightChanged = false;
          const background = cfg.backgroundEnabled ? nativeColor(cfg.background) : null;
          const line = cfg.lineEnabled ? nativeColor(cfg.line) : null;
          if (cfg.backgroundEnabled && background != null) {
            next.backgroundColor = background;
            highlightChanged = true;
          }
          if (cfg.lineEnabled && line != null) {
            next.gutterColor = line;
            highlightChanged = true;
          }
          if (highlightChanged) result.backgroundHighlight = next;
          const textColor = effectiveMentionTextColor(cfg);
          if (textColor && result.message && typeof result.message === "object") {
            const processed = nativeColor(textColor);
            if (processed != null) result.message.textColor = processed;
          }
        } catch (error) {
          try { console.error("[ThemeToolkit] message row styling failed", error); } catch {}
        }
        return result;
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed to patch message row styling", error); } catch {}
      return null;
    }
  }

  async function resetAllDiscordFolderColors() {
    let folders;
    try { folders = FolderStore?.getGuildFolders?.(); } catch {}
    if (!Array.isArray(folders) || typeof FolderActions?.saveGuildFolders !== "function") {
      toast("Folder reset API is unavailable on this Discord build");
      return;
    }
    const changed = folders.filter(folder => folder?.folderColor != null || folder?.color != null).length;
    if (!changed) { toast("All folder colors are already at Discord default"); return; }
    const next = folders.map(folder => ({
      ...folder,
      folderColor: null,
      ...(Object.prototype.hasOwnProperty.call(folder, "color") ? { color: null } : {}),
    }));
    try {
      await FolderActions.saveGuildFolders(next);
      refreshFolderUI();
      toast(`Reset ${changed} folder color${changed === 1 ? "" : "s"} to true default`);
    } catch (error) {
      try { console.error("[ThemeToolkit] folder reset failed", error); } catch {}
      toast("Could not reset folder colors");
    }
  }

  // BEGIN THEME BUILDER
  // Included inside the plugin IIFE by scripts/build-theme-toolkit.cjs.
  const BUILDER_VERSION = "2.2.1";
  const BUILDER_RELEASE_ID = "69fdf09de77cf89c59608e249e6a6d01ceab78db715d33e958073879c29bc47f";
  const THEME_LIMIT = 100;
  const THEME_TEXT_LIMIT = 1000000;
  const LOCAL_THEME_PREFIX = "theme-toolkit://theme/";
  const PREVIEW_THEME_ID = "theme-toolkit://preview";
  let builderStarted = false;
  let builderBusy = false;
  let builderThemeMutation = false;
  let unpatchLocalThemeFetch = null;
  let builderStartup = null;
  let builderSurfacePatches = [];
  let settingsShortcutCleanup = null;
  const popupSurfaceStats = { hooked: false, calls: 0, applied: 0 };
  const avatarRuntimeStats = {
    exactAPI: false,
    dmFast: { found: false, hooked: false, calls: 0, applied: 0, error: null },
    dmBase: { found: false, hooked: false, calls: 0, applied: 0, error: null },
    dmContent: { found: false, hooked: false, calls: 0, applied: 0, error: null },
    messageRows: { found: false, hooked: false, calls: 0, applied: 0, error: null },
    chatLayout: { found: false, hooked: false, calls: 0, applied: 0, error: null },
  };
  let toolkitUpdateIncomplete = false;
  const builderListeners = new Set();
  const cloneThemeValue = value => JSON.parse(JSON.stringify(value));
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value ?? {}, key);
  const themeName = name => String(name ?? "").trim().replace(/\s+/g, " ").slice(0, 64);
  const newThemeId = () => `theme-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  function checkToolkitRelease() {
    const expected = vendetta.plugin.manifest?.toolkit?.releaseId;
    if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected) || expected === BUILDER_RELEASE_ID) return false;
    toolkitUpdateIncomplete = true;
    try {
      const installed = vendetta.plugins?.plugins?.[vendetta.plugin.id];
      if (installed?.manifest?.toolkit?.releaseId === expected) {
        // Revenge may store a new manifest beside old JS after a failed download.
        // Invalidate only our comparison hash so its next Refetch retries the JS.
        // Plugin data, installed code, update preferences and other plugins stay intact.
        installed.manifest = { ...installed.manifest, hash: `toolkit-retry-${BUILDER_RELEASE_ID}` };
      }
    } catch {}
    return true;
  }
  function notifyBuilder() { for (const listener of [...builderListeners]) { try { listener(); } catch {} } }
  function useBuilderUpdates() {
    const [, update] = React.useReducer(value => value + 1, 0);
    React.useEffect(() => { builderListeners.add(update); return () => builderListeners.delete(update); }, []);
    return update;
  }
  function plainObject(value) { return value && typeof value === "object" && !Array.isArray(value); }
  function safeJSON(text) {
    if (typeof text !== "string" || text.length > THEME_TEXT_LIMIT) throw new Error("Theme files must be under 1 MB");
    return JSON.parse(text, (key, value) => {
      if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("Invalid theme property");
      return value;
    });
  }
  function manifestColor(value) {
    if (value === "transparent") return "#00000000";
    if (typeof value === "string" && /^#[0-9a-f]{3,4}$/i.test(value)) value = "#" + value.slice(1).split("").map(c => c + c).join("");
    let normalized = colorValue(value);
    if (!normalized && typeof value === "string" && typeof RN.processColor === "function") {
      try {
        const processed = RN.processColor(value);
        if (typeof processed === "number") {
          const n = processed >>> 0, alpha = n >>> 24;
          normalized = `#${(n & 0xFFFFFF).toString(16).padStart(6, "0")}${alpha === 255 ? "" : alpha.toString(16).padStart(2, "0")}`.toUpperCase();
        }
      } catch {}
    }
    if (!normalized) throw new Error(`Invalid color: ${String(value).slice(0, 32)}`);
    return normalized;
  }
  function normalizeThemeManifest(input) {
    if (!plainObject(input)) throw new Error("That file does not contain a theme");
    const data = safeJSON(JSON.stringify(input));
    if (data.spec == null && (data.semanticColors || data.rawColors)) data.spec = 2;
    if (![2, 3].includes(data.spec)) throw new Error("Use a Revenge theme (spec 2 or 3)");
    if (!themeName(data.name)) throw new Error("A theme needs a name");
    data.name = themeName(data.name);
    if (data.spec === 3) {
      if (!plainObject(data.main)) throw new Error("The theme is missing its color definitions");
      // Resolve explicit spec-3 colors; raw references retain their resolved color.
      const tokenRef = (() => { try { return findByProps("SemanticColor"); } catch { return null; } })();
      const raw = data.main.raw ?? {};
      const semantic = {};
      for (const [key, entry] of Object.entries(data.main.semantic ?? {})) {
        let value = typeof entry === "string" ? entry : entry?.value;
        if (typeof value !== "string") throw new Error(`Invalid theme color: ${key}`);
        if (!value.startsWith("#") && value !== "transparent") value = raw[value] ?? tokenRef?.RawColor?.[value];
        let color = manifestColor(value);
        if (plainObject(entry) && entry.opacity != null) color = withAlpha(color, clamp(Number(entry.opacity), 0, 1));
        semantic[key] = [color, color];
      }
      data.semanticColors = semantic;
      data.rawColors = raw;
      if (data.main.background) data.background = { ...data.main.background, alpha: data.main.background.opacity ?? 1 };
      delete data.main;
      delete data.type;
      data.spec = 2;
    }
    for (const property of ["semanticColors", "rawColors"]) {
      if (data[property] == null) data[property] = {};
      if (!plainObject(data[property]) || Object.keys(data[property]).length > 2000) throw new Error("Invalid theme color definitions");
      for (const [key, value] of Object.entries(data[property])) {
        if (!/^[A-Z][A-Z0-9_]{0,100}$/.test(key)) throw new Error(`Invalid color name: ${key}`);
        if (property === "semanticColors") {
          if (!Array.isArray(value) || !value.length || value.length > 4) throw new Error(`Invalid color variants: ${key}`);
          data[property][key] = value.map(color => color === false ? false : manifestColor(color));
        } else data[property][key] = manifestColor(value);
      }
    }
    if (data.background) {
      if (!plainObject(data.background) || !/^https:\/\/[^\s]+$/i.test(data.background.url ?? "")) throw new Error("Use an HTTPS image URL for a theme background");
      if (!Number.isFinite(Number(data.background.alpha ?? 1)) || !Number.isFinite(Number(data.background.blur ?? 0))) throw new Error("Invalid background opacity or blur");
      data.background = { url: data.background.url, blur: clamp(Number(data.background.blur) || 0, 0, 100), alpha: clamp(Number(data.background.alpha ?? 1), 0, 1) };
    }
    if (data.authors != null && (!Array.isArray(data.authors) || data.authors.some(author => typeof author?.name !== "string"))) throw new Error("Invalid theme authors");
    if (data.themeToolkit != null && !plainObject(data.themeToolkit)) throw new Error("Invalid Toolkit theme metadata");
    if (plainObject(data.themeToolkit?.avatars) && own(data.themeToolkit.avatars, "memberList")) delete data.themeToolkit.avatars.memberList;
    return data;
  }
  function validateThemeAppearance(input) {
    const result = materializeAppearanceValues(input);
    for (const key of PROFILE_SETTING_KEYS) {
      const value = result[key];
      if (!isAppearanceValue(value)) throw new Error(`Invalid setting: ${key}`);
      if (typeof value === "string" && value.length > (key === "iconCustomPack" ? ICON_PACK_TEXT_LIMIT : 5000)) throw new Error(`Setting is too long: ${key}`);
      if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`Invalid number: ${key}`);
      if (value && (key.endsWith("Accent") || /(?:Color|Background|Line|Gradient[123])$/.test(key)) && key !== "folderColorSource") manifestColor(value);
    }
    if (result.iconPack === "custom" && result.iconCustomPack) parseIconPack(result.iconCustomPack);
    for (const slot of ICON_SLOTS) if (result[`${slot.key}IconMode`] === "custom" && result[`${slot.key}IconImage`] && !storedIconImage(result[`${slot.key}IconImage`])) throw new Error(`Invalid ${slot.label} image`);
    return result;
  }
  function makeThemeDocument(data, values, options = {}) {
    const manifest = normalizeThemeManifest(data);
    return { schema: 1, id: options.id ?? newThemeId(), name: themeName(options.name ?? manifest.name), savedAt: options.savedAt ?? Date.now(),
      originThemeId: options.originThemeId ?? null, legacyProfileId: options.legacyProfileId ?? null,
      data: manifest, values: validateThemeAppearance(values ?? manifest.themeToolkit?.appearance ?? APPEARANCE_DEFAULTS) };
  }
  function savedThemes() { return Array.isArray(pluginStorage.toolkitThemes) ? pluginStorage.toolkitThemes : []; }
  function themeDocument(id) { return savedThemes().find(item => item.id === id) ?? null; }
  function documentManifest(document) {
    const data = normalizeThemeManifest(document.data);
    data.name = themeName(document.name);
    data.themeToolkit = { ...data.themeToolkit, appearance: validateThemeAppearance(document.values), builder: { version: 1, id: document.id } };
    return data;
  }
  function documentExport(document) { return JSON.stringify(documentManifest(document), null, 2); }
  function localThemeId(id) { return LOCAL_THEME_PREFIX + encodeURIComponent(id); }
  async function awaitThemeStore() {
    const store = themeStorage();
    if (!store) throw new Error("Revenge’s theme manager is unavailable on this build");
    if (typeof store[themeReadySymbol] === "function") await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Theme storage is still loading. Try again shortly.")), 10000);
      store[themeReadySymbol](() => { clearTimeout(timer); resolve(); });
    });
    return store;
  }
  async function selectNativeTheme(record) {
    const api = themeAPI();
    if (typeof api?.selectTheme === "function") await api.selectTheme(record);
    else if (typeof vendetta.themes?.selectTheme === "function") await vendetta.themes.selectTheme(record?.id ?? "default");
    else throw new Error("Revenge’s theme selection API is unavailable");
    refreshToolkitUI();
    notifyBuilder();
  }
  function syncBuilderAppearance() {
    const selected = currentTheme();
    let values = selected?.data?.themeToolkit?.appearance;
    if (!values && selected?.id?.startsWith(LOCAL_THEME_PREFIX)) {
      try { values = themeDocument(decodeURIComponent(selected.id.slice(LOCAL_THEME_PREFIX.length)))?.values; } catch {}
    }
    activeBuilderAppearance = plainObject(values) ? materializeAppearanceValues(values) : null;
    if (builderStarted && !builderThemeMutation && pluginStorage.toolkitPreviewRecovery && selected?.id !== PREVIEW_THEME_ID) {
      // A deliberate native theme selection ends a preview; never switch it back.
      const recovery = pluginStorage.toolkitPreviewRecovery;
      delete pluginStorage.toolkitPreviewRecovery;
      const store = themeStorage();
      if (store?.[PREVIEW_THEME_ID]) delete store[PREVIEW_THEME_ID];
      if (own(recovery, "font")) void (async () => { await selectRevengeFont(recovery.font); await applyThemeFont(selected); })();
    }
    notifyBuilder();
  }
  async function initializeThemeLibrary() {
    await awaitThemeStore();
    if (pluginStorage.toolkitThemeLibraryVersion === 1) return;
    const theme = currentTheme();
    const currentData = theme?.data ?? { spec: 2, name: "Discord default", semanticColors: {}, rawColors: {} };
    const values = appearanceSnapshot();
    const profiles = storedProfiles();
    // Store the original records before converting anything. Legacy data is retained.
    if (!pluginStorage.toolkitThemeMigrationBackup) pluginStorage.toolkitThemeMigrationBackup = { date: Date.now(), theme: cloneThemeValue(theme), values: cloneThemeValue(values), profiles: cloneThemeValue(pluginStorage.toolkitProfiles ?? []) };
    const documents = [...savedThemes()];
    const add = document => { if (!documents.some(item => item.id === document.id)) documents.push(document); };
    const migrate = (legacyValues, options) => {
      const document = makeThemeDocument(currentData, APPEARANCE_DEFAULTS, options);
      // Older fields were saved while typing. Retain unfinished input in the
      // editor instead of letting one invalid field block the whole upgrade.
      document.values = materializeAppearanceValues(legacyValues);
      add(document);
    };
    migrate(values, { id: "migrated-current", name: currentData.name ?? "My current theme", originThemeId: theme?.id ?? null });
    for (const profile of profiles) migrate(profile.values, { id: `migrated-${profile.id}`, name: profile.name, legacyProfileId: profile.id, originThemeId: null });
    pluginStorage.toolkitThemes = documents;
    pluginStorage.toolkitThemeLibraryVersion = 1;
    notifyBuilder();
  }
  function activeDocumentId() {
    const theme = currentTheme();
    if (theme?.id?.startsWith(LOCAL_THEME_PREFIX)) {
      try { return decodeURIComponent(theme.id.slice(LOCAL_THEME_PREFIX.length)); } catch { return null; }
    }
    if (theme?.id === PREVIEW_THEME_ID) return null;
    const current = savedThemes().find(doc => doc.id === "migrated-current" && doc.originThemeId === (theme?.id ?? null) && appearanceValuesMatch(doc.values, appearanceSnapshot()));
    if (!current) return null;
    try {
      const data = normalizeThemeManifest(theme?.data ?? { spec: 2, name: "Discord default" });
      const base = current.data;
      return ["semanticColors", "rawColors", "background", "themeToolkit"].every(key => JSON.stringify(data[key]) === JSON.stringify(base[key])) ? current.id : null;
    } catch { return null; }
  }
  async function registerNativeTheme(document, apply = false) {
    const store = await awaitThemeStore(), id = localThemeId(document.id);
    const previous = store[id] ? cloneThemeValue(store[id]) : null;
    const previousSelection = currentTheme() ? cloneThemeValue(currentTheme()) : null;
    const record = { id, selected: apply || !!store[id]?.selected, data: documentManifest(document) };
    builderThemeMutation = true;
    try {
      store[id] = record;
      if (record.selected) { await selectNativeTheme(store[id]); await applyThemeFont(store[id]); }
    } catch (error) {
      if (previous) store[id] = previous; else delete store[id];
      try { await selectNativeTheme(previousSelection ? (store[previousSelection.id] ?? previousSelection) : null); } catch {}
      throw error;
    } finally { builderThemeMutation = false; syncBuilderAppearance(); }
    return record;
  }
  async function stopThemePreview() {
    const recovery = pluginStorage.toolkitPreviewRecovery;
    if (!recovery) return;
    const store = await awaitThemeStore();
    builderThemeMutation = true;
    try {
      if (currentTheme()?.id === PREVIEW_THEME_ID || loaderTheme()?.id === PREVIEW_THEME_ID && !currentTheme()) {
        const previous = recovery.previous;
        if (previous && !store[previous.id]) store[previous.id] = cloneThemeValue(previous);
        await selectNativeTheme(previous ? store[previous.id] : null);
        if (own(recovery, "font")) await selectRevengeFont(recovery.font);
      }
      delete store[PREVIEW_THEME_ID];
      delete pluginStorage.toolkitPreviewRecovery;
    } finally { builderThemeMutation = false; syncBuilderAppearance(); }
  }
  async function previewThemeDocument(document) {
    const data = documentManifest(document), store = await awaitThemeStore();
    if (!pluginStorage.toolkitPreviewRecovery) pluginStorage.toolkitPreviewRecovery = { previous: currentTheme() ? cloneThemeValue(currentTheme()) : null, font: currentRevengeFont(), date: Date.now() };
    builderThemeMutation = true;
    try {
      store[PREVIEW_THEME_ID] = { id: PREVIEW_THEME_ID, selected: true, data: { ...data, name: `${data.name} · Preview` } };
      await selectNativeTheme(store[PREVIEW_THEME_ID]);
      await applyThemeFont(store[PREVIEW_THEME_ID]);
    } catch (error) {
      builderThemeMutation = false;
      await stopThemePreview();
      throw error;
    } finally { builderThemeMutation = false; syncBuilderAppearance(); }
  }
  async function saveThemeDocument(document, asNew = false, clearDraft = true) {
    const saved = makeThemeDocument(document.data, document.values, { ...document, id: asNew ? newThemeId() : document.id, savedAt: Date.now() });
    saved.data.name = saved.name;
    if (!saved.name) throw new Error("Enter a theme name first");
    const existing = savedThemes();
    if (!existing.some(item => item.id === saved.id) && existing.length >= THEME_LIMIT) throw new Error(`You can save up to ${THEME_LIMIT} themes`);
    await stopThemePreview();
    const store = await awaitThemeStore();
    const active = activeDocumentId() === saved.id;
    if (active || store[localThemeId(saved.id)]) await registerNativeTheme(saved, active);
    pluginStorage.toolkitThemes = existing.some(item => item.id === saved.id) ? existing.map(item => item.id === saved.id ? saved : item) : [...existing, saved];
    if (clearDraft) delete pluginStorage.toolkitThemeDraft;
    notifyBuilder();
    return saved;
  }
  async function applyThemeDocument(document) { await stopThemePreview(); await registerNativeTheme(document, true); }
  async function deleteThemeDocument(document) {
    await stopThemePreview();
    const store = await awaitThemeStore(), id = localThemeId(document.id);
    if (store[id]?.selected || activeDocumentId() === document.id) await selectNativeTheme(null);
    delete store[id];
    pluginStorage.toolkitThemes = savedThemes().filter(item => item.id !== document.id);
    if (pluginStorage.toolkitThemeDraft?.document?.id === document.id) delete pluginStorage.toolkitThemeDraft;
    notifyBuilder();
  }
  function importedThemeDocuments(text) {
    const parsed = safeJSON(text);
    if (parsed?.format === "theme-toolkit-theme-library" && parsed.version === 1) {
      if (!Array.isArray(parsed.themes) || !parsed.themes.length || parsed.themes.length > THEME_LIMIT) throw new Error("Invalid theme library backup");
      return parsed.themes.map(data => makeThemeDocument(data, data?.themeToolkit?.appearance));
    }
    if (parsed?.format === PROFILE_BACKUP_FORMAT) {
      const base = currentTheme()?.data ?? { spec: 2, name: "Discord default" };
      return parseProfileBackup(text).map(profile => makeThemeDocument(base, profile.values, { name: profile.name, legacyProfileId: profile.id }));
    }
    return [makeThemeDocument(parsed, parsed?.themeToolkit?.appearance)];
  }
  function themeLibraryBackup() { return JSON.stringify({ format: "theme-toolkit-theme-library", version: 1, themes: savedThemes().map(documentManifest) }, null, 2); }
  function importThemes(text) {
    const imported = importedThemeDocuments(text), existing = savedThemes();
    if (existing.length + imported.length > THEME_LIMIT) throw new Error(`Import would exceed the ${THEME_LIMIT}-theme limit`);
    const used = new Set(existing.map(item => item.name.toLowerCase()));
    for (const document of imported) {
      if (used.has(document.name.toLowerCase())) document.name = uniqueImportedName(document.name, used);
      used.add(document.name.toLowerCase());
    }
    pluginStorage.toolkitThemes = [...existing, ...imported];
    notifyBuilder();
    return imported;
  }
  function patchLocalThemeFetch() {
    if (typeof globalThis.fetch !== "function") return null;
    const original = globalThis.fetch;
    const replacement = function(input, options) {
      const url = typeof input === "string" ? input : input?.url ?? String(input);
      if (url !== PREVIEW_THEME_ID && !url.startsWith(LOCAL_THEME_PREFIX)) return original.call(this, input, options);
      if (options?.signal?.aborted) return Promise.reject(new Error("Theme refresh was cancelled"));
      const record = themeStorage()?.[url];
      // Native Refetch must retain local data, never request a made-up network URL.
      if (!record?.data) return Promise.reject(new Error("This local theme is no longer saved"));
      const body = JSON.stringify(record.data);
      if (typeof globalThis.Response === "function") return Promise.resolve(new globalThis.Response(body, { status: 200, headers: { "Content-Type": "application/json" } }));
      return Promise.resolve({ ok: true, status: 200, statusText: "OK", json: async () => JSON.parse(body), text: async () => body });
    };
    globalThis.fetch = replacement;
    return () => { if (globalThis.fetch === replacement) globalThis.fetch = original; };
  }
  function documentFileAPIs() {
    let picker, files;
    try { picker = findByProps("pick", "saveDocuments", "keepLocalCopy"); } catch {}
    try {
      const names = ["NativeFileModule", "RTNFileManager", "DCDFileManager"];
      for (const name of names) {
        try {
          const module = RN.TurboModuleRegistry?.get?.(name) ?? globalThis.__turboModuleProxy?.(name) ?? RN.NativeModules?.[name] ?? globalThis.nativeModuleProxy?.[name];
          if (typeof module?.readFile === "function" && typeof module?.writeFile === "function") { files = module; break; }
        } catch {}
      }
    } catch {}
    return { picker, files };
  }
  function fileCancelled(error) { return /cancel|operation_canceled/i.test(String(error?.code ?? "") + " " + String(error?.message ?? "")); }
  async function readThemeFile() {
    const { picker, files } = documentFileAPIs();
    if (!picker || !files) throw new Error("File import is unavailable on this build. Paste the theme text instead.");
    const [picked] = await picker.pick({ mode: "import", allowMultiSelection: false, type: [picker.types?.allFiles ?? "*/*"] });
    if (!picked) return null;
    if (Number(picked.size) > THEME_TEXT_LIMIT) throw new Error("Theme files must be under 1 MB");
    const [copy] = await picker.keepLocalCopy({ destination: "cachesDirectory", files: [{ uri: picked.uri, fileName: "theme-toolkit-import.json" }] });
    if (copy?.status !== "success" || !copy.localUri?.startsWith("file://")) throw new Error("Could not read the selected theme file");
    const path = decodeURIComponent(copy.localUri.slice(7));
    try {
      const text = await files.readFile(path, "utf8");
      if (text.length > THEME_TEXT_LIMIT) throw new Error("Theme files must be under 1 MB");
      return text;
    } finally {
      const cache = files.getConstants?.().CacheDirPath;
      if (cache && path.startsWith(cache + "/")) { try { await files.removeFile?.("cache", path.slice(cache.length + 1)); } catch {} }
    }
  }
  async function exportThemeFile(document) {
    const fileName = (document.name.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "my-theme") + ".json";
    return exportThemeTextFile(documentExport(document), fileName);
  }
  async function exportThemeTextFile(text, fileName) {
    const { picker, files } = documentFileAPIs();
    if (!picker || !files) throw new Error("File export is unavailable on this build. Copy theme text instead.");
    if (text.length > THEME_TEXT_LIMIT) throw new Error("This backup is too large. Export themes individually.");
    const relative = "theme-toolkit-export.json";
    const written = await files.writeFile("cache", relative, text, "utf8");
    const path = typeof written === "string" && written ? written : `${files.getConstants().CacheDirPath}/${relative}`;
    try {
      const results = await picker.saveDocuments({ sourceUris: [path.startsWith("file://") ? path : "file://" + path], fileName, mimeType: "application/json", copy: true });
      if (!results?.length || results.some(result => result.error)) throw new Error("The theme file could not be saved");
    } finally { try { await files.removeFile?.("cache", relative); } catch {} }
  }
  function installThemeToolkitSettingsShortcut() {
    try { settingsShortcutCleanup?.(); } catch {}
    settingsShortcutCleanup = null;

    const byProps = (...props) => { try { return findByProps(...props); } catch { return null; } };
    const settingConstants = byProps("SETTING_RENDERER_CONFIG");
    const createListModule = byProps("createList");
    const rootNavigation = byProps("getRootNavigationRef");
    if (!settingConstants || !createListModule?.createList || !rootNavigation?.getRootNavigationRef) return false;

    const shortcutKey = "ITS_TRIPLE_SIX_THEME_TOOLKIT";
    const shortcutIcon = getAssetIDByName?.("PaintPaletteIcon") ?? getAssetIDByName?.("FolderIcon");
    const removeRenderer = () => {
      try {
        const current = settingConstants.SETTING_RENDERER_CONFIG ?? {};
        if (current[shortcutKey]) {
          const next = { ...current };
          delete next[shortcutKey];
          settingConstants.SETTING_RENDERER_CONFIG = next;
        }
      } catch {}
    };
    const openThemeToolkit = () => {
      try {
        const navigation = rootNavigation.getRootNavigationRef();
        if (!navigation?.navigate) throw new Error("Navigation unavailable");
        navigation.navigate("BUNNY_CUSTOM_PAGE", {
          title: "Theme Toolkit",
          render: () => bh(ThemeBuilderSettings),
        });
      } catch (error) {
        toast(`Could not open Theme Toolkit: ${error?.message ?? error}`);
      }
    };

    try {
      const current = settingConstants.SETTING_RENDERER_CONFIG ?? {};
      settingConstants.SETTING_RENDERER_CONFIG = {
        ...current,
        [shortcutKey]: {
          type: "pressable",
          useTitle: () => "Theme Toolkit",
          title: () => "Theme Toolkit",
          icon: shortcutIcon,
          IconComponent: shortcutIcon != null
            ? () => bh(RN.Image, { source: shortcutIcon, style: { width: 24, height: 24, tintColor: BUI.heading.color } })
            : undefined,
          onPress: openThemeToolkit,
          withArrow: true,
        },
      };
    } catch {
      return false;
    }

    let unpatch = null;
    try {
      unpatch = after("createList", createListModule, args => {
        try {
          const sections = args?.[0]?.sections;
          if (!Array.isArray(sections)) return;
          const section = sections.find(item =>
            Array.isArray(item?.settings) && item.settings.includes("BUNNY")
          ) ?? sections.find(item => item?.label === "Revenge" || item?.title === "Revenge");
          if (!section || !Array.isArray(section.settings) || section.settings.includes(shortcutKey)) return;

          const themesIndex = section.settings.indexOf("BUNNY_THEMES");
          const fontsIndex = section.settings.indexOf("BUNNY_FONTS");
          const pluginsIndex = section.settings.indexOf("BUNNY_PLUGINS");
          const insertAt = themesIndex >= 0
            ? themesIndex + 1
            : fontsIndex >= 0
              ? fontsIndex
              : pluginsIndex >= 0
                ? pluginsIndex + 1
                : section.settings.length;
          section.settings.splice(insertAt, 0, shortcutKey);
        } catch {}
      });
    } catch {
      removeRenderer();
      return false;
    }

    settingsShortcutCleanup = () => {
      try { unpatch?.(); } catch {}
      removeRenderer();
    };
    return true;
  }
  function startThemeBuilder() {
    checkToolkitRelease();
    builderStarted = true;
    installThemeToolkitSettingsShortcut();
    builderSurfacePatches = patchBuilderSurfaces();
    unpatchLocalThemeFetch = patchLocalThemeFetch();
    // End interrupted previews before migration or any active-theme synchronization.
    builderStartup = (async () => {
      await awaitThemeStore();
      await stopThemePreview();
      await initializeThemeLibrary();
      syncBuilderAppearance();
    })().catch(() => { /* Settings retries and shows a readable error; existing hooks stay usable. */ });
  }
  function stopThemeBuilder() {
    builderStarted = false;
    try { settingsShortcutCleanup?.(); } catch {}
    settingsShortcutCleanup = null;
    for (const unpatch of builderSurfacePatches.reverse()) { try { unpatch(); } catch {} }
    builderSurfacePatches = [];
    popupSurfaceStats.hooked = false;
    if (pluginStorage.toolkitPreviewRecovery) void stopThemePreview().catch(() => {});
    unpatchLocalThemeFetch?.(); unpatchLocalThemeFetch = null;
    activeBuilderAppearance = null;
    builderListeners.clear();
  }

  const GENERAL_BORDER_KEYS = ("BORDER_FAINT BORDER_MUTED BORDER_SUBTLE BORDER_NORMAL BORDER_STRONG APP_FRAME_BORDER CARD_BORDER_DEFAULT "
    + "CONTROL_SECONDARY_BORDER_DEFAULT CONTROL_SECONDARY_BORDER_ACTIVE CONTROL_PRIMARY_BORDER_DEFAULT CONTROL_PRIMARY_BORDER_ACTIVE REDESIGN_BUTTON_SECONDARY_BORDER "
    + "CONTROL_OVERLAY_PRIMARY_BORDER_DEFAULT CONTROL_OVERLAY_SECONDARY_BORDER_DEFAULT MOBILE_LEGACY_BUTTON_SECONDARY_BORDER_DEFAULT "
    + "INPUT_BORDER_DEFAULT INPUT_BORDER_ACTIVE MOBILE_CHATINPUT_BORDER_DEFAULT MOBILE_CHATINPUT_BORDER_ACTIVE "
    + "MOBILE_HEADER_BORDER STANDALONE_CHANNEL_HEADER_BORDER CHAT_BORDER MOBILE_FLOATING_ACCESSORY_BORDER").split(" ");
  const GENERAL_BORDER_GROUP = ["Borders and outlines", GENERAL_BORDER_KEYS.join(" ")];
  const INTERFACE_ICON_KEYS = ("INTERACTIVE_ICON_DEFAULT TABLEROW_ICON_COLOR_DEFAULT ICON_PRIMARY ICON_STRONG ICON_MUTED "
    + "CHANNEL_ICON INTERACTIVE_NORMAL INTERACTIVE_ACTIVE INTERACTIVE_HOVER INTERACTIVE_MUTED").split(" ");
  const INTERFACE_ICON_GROUP = ["Interface icons", INTERFACE_ICON_KEYS.join(" ")];
  const BUILDER_COLORS = {
    backgrounds: [
      ["App background", "BACKGROUND_BASE_LOWER BACKGROUND_BASE_LOW BACKGROUND_PRIMARY BACKGROUND_MOBILE_PRIMARY BG_BASE_PRIMARY HOME_BACKGROUND", "PRIMARY_600 PRIMARY_630 PRIMARY_645 PRIMARY_660 PRIMARY_700 PRIMARY_800 PRIMARY_900 PLUM_17 PLUM_18 PLUM_19 PLUM_20 PLUM_21 PLUM_22 PLUM_24 PLUM_25"],
      ["Chat background", "CHAT_BACKGROUND CHANNEL_BACKGROUND_DEFAULT"],
      ["Server and channel sidebar", "PANEL_BG BACKGROUND_BASE_LOWEST BG_BASE_SECONDARY BG_BASE_TERTIARY BACKGROUND_SECONDARY BACKGROUND_SECONDARY_ALT BACKGROUND_TERTIARY BACKGROUND_MOBILE_SECONDARY"],
      ["Cards and panels", "BACKGROUND_SURFACE_HIGH BACKGROUND_SURFACE_HIGHEST CARD_PRIMARY_BG CARD_SECONDARY_BG CARD_BACKGROUND_DEFAULT CARD_SECONDARY_BACKGROUND_DEFAULT EMBED_BACKGROUND EMBED_BACKGROUND_ALTERNATE BG_SURFACE_RAISED"],
      ["Text inputs", "CHANNELTEXTAREA_BACKGROUND CHAT_INPUT_BACKGROUND REDESIGN_CHAT_INPUT_BACKGROUND INPUT_BACKGROUND_DEFAULT MOBILE_CHATINPUT_BACKGROUND_DEFAULT MOBILE_CHATINPUT_BACKGROUND_ACTIVE"],
    ],
    text: [
      ["Message text", "TEXT_NORMAL TEXT_PRIMARY TEXT_DEFAULT", "PRIMARY_100"],
      ["Headings", "HEADER_PRIMARY TEXT_STRONG"],
      ["Secondary text", "TEXT_SECONDARY HEADER_SECONDARY TEXT_SUBTLE", "PRIMARY_300 PRIMARY_330"],
      ["Muted text", "TEXT_MUTED", "PRIMARY_400 PRIMARY_460"],
      ["Channel names", "CHANNELS_DEFAULT REDESIGN_CHANNEL_NAME_TEXT"],
      ["Links", "TEXT_LINK"],
    ],
    accents: [
      ["Main accent", "TEXT_BRAND CONTROL_BRAND_FOREGROUND CONTROL_BRAND_FOREGROUND_NEW STATUS_BRAND", "BRAND_360 BRAND_400 BRAND_500 BRAND_530"],
      ["Primary buttons", "BUTTON_FILLED_BRAND_BACKGROUND REDESIGN_BUTTON_PRIMARY_BACKGROUND CONTROL_PRIMARY_BACKGROUND_DEFAULT CHAT_INPUT_SEND_BUTTON_ACTIVE_BACKGROUND"],
      ["Button text", "BUTTON_FILLED_BRAND_TEXT REDESIGN_BUTTON_PRIMARY_TEXT CONTROL_PRIMARY_TEXT_DEFAULT CHAT_INPUT_SEND_BUTTON_ICON_ACTIVE_TINT"],
      ["Secondary buttons", "REDESIGN_BUTTON_SECONDARY_BACKGROUND CONTROL_SECONDARY_BACKGROUND_DEFAULT"],
      ["Selected items", "BACKGROUND_MODIFIER_SELECTED BACKGROUND_MOD_STRONG CONTROL_SECONDARY_BACKGROUND_ACTIVE"],
      GENERAL_BORDER_GROUP,
      ["Positive status", "STATUS_POSITIVE STATUS_ONLINE TEXT_POSITIVE", "GREEN_360 GREEN_400 GREEN_500 GREEN_600"],
      ["Warning status", "STATUS_WARNING TEXT_WARNING", "YELLOW_300 YELLOW_360 YELLOW_400"],
      ["Danger status", "STATUS_DANGER TEXT_DANGER", "RED_360 RED_400 RED_500 RED_600"],
    ],
  };
  // Mobile consumers and compatibility aliases are documented in docs/theme-toolkit-mobile-colors.md.
  // Each background control brings its mobile surface into the sample without applying the draft.
  const BACKGROUND_PREVIEW_VIEWS = ["settings", "chat", "channels", "chat", "chat"];
  const BUILDER_COLOR_HELP = {
    "Text inputs": "Search fields and the message composer.",
    "Cards and panels": "Cards, embeds and the Quest card above your user bar.",
  };
  function interfaceIconColor(theme = currentTheme()) {
    const config = theme?.data?.themeToolkit?.interfaceIcons;
    return config?.enabled === true ? colorValue(config.color) : null;
  }
  function originalInterfaceIconToken(data, key) {
    const config = data?.themeToolkit?.interfaceIcons;
    return colorValue(config?.enabled && own(config.restore, key) ? config.restore[key] : data?.semanticColors?.[key]);
  }
  function popupBackgroundColor(theme = currentTheme()) {
    return colorValue(theme?.data?.themeToolkit?.popupBackground);
  }
  function setInterfaceIconsEnabled(document, enabled) {
    const active = document.data.themeToolkit?.interfaceIcons?.enabled === true;
    if (!!enabled === active) return document;
    const next = cloneThemeValue(document);
    next.data.themeToolkit ??= {};
    const previous = next.data.themeToolkit.interfaceIcons;
    if (enabled) {
      const color = colorValue(previous?.color) ?? (groupValue(document, "INTERACTIVE_ICON_DEFAULT INTERACTIVE_NORMAL ICON_PRIMARY") || "#FFFFFF");
      next.data.themeToolkit.interfaceIcons = { enabled: true, color,
        restore: Object.fromEntries(INTERFACE_ICON_KEYS.map(key => [key, next.data.semanticColors[key] ?? null])) };
      return changeInterfaceIconColor(next, color);
    }
    const restore = previous?.restore;
    if (plainObject(restore)) for (const key of INTERFACE_ICON_KEYS) {
      delete next.data.semanticColors[key];
      const colors = restore[key];
      if (Array.isArray(colors) && colors.length > 0 && colors.length <= 4 && colors.every(value => value === false || colorValue(value))) next.data.semanticColors[key] = colors;
    }
    next.data.themeToolkit.interfaceIcons = { enabled: false, color: colorValue(previous?.color) ?? "#FFFFFF" };
    return next;
  }
  function changeInterfaceIconColor(document, value) {
    const color = colorValue(value);
    if (!color) return value.trim() ? document : setInterfaceIconsEnabled(document, false);
    const active = document.data.themeToolkit?.interfaceIcons?.enabled === true ? document : setInterfaceIconsEnabled(document, true);
    const next = changeColorGroup(active, INTERFACE_ICON_GROUP, color);
    next.data.themeToolkit.interfaceIcons.color = color;
    return next;
  }
  function changePopupBackground(document, value) {
    const color = colorValue(value);
    if (value.trim() && !color) return document;
    const next = cloneThemeValue(document);
    next.data.themeToolkit ??= {};
    if (color) next.data.themeToolkit.popupBackground = color;
    else delete next.data.themeToolkit.popupBackground;
    return next;
  }
  const AVATAR_SURFACE_DEFAULTS = Object.freeze({
    messageDM: Object.freeze({ show: true }),
    messageServer: Object.freeze({ show: true }),
    dmList: Object.freeze({ show: true, usernameSize: 16 }),
  });
  const USERNAME_SIZE_VALUES = [12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32];
  function themeData(value) { return value?.data ?? value ?? {}; }
  function toolkitAvatarConfig(theme = currentTheme()) {
    const raw = themeData(theme)?.themeToolkit?.avatars;
    return Object.fromEntries(Object.entries(AVATAR_SURFACE_DEFAULTS).map(([key, defaults]) =>
      [key, { ...defaults, ...(plainObject(raw?.[key]) ? raw[key] : {}) }]));
  }
  function changeAvatarSurface(document, surface, key, value) {
    if (!own(AVATAR_SURFACE_DEFAULTS, surface) || !own(AVATAR_SURFACE_DEFAULTS[surface], key)) return document;
    const next = cloneThemeValue(document);
    next.data.themeToolkit ??= {};
    const config = toolkitAvatarConfig({ data: next.data });
    config[surface][key] = key === "show" ? !!value : Number(value);
    next.data.themeToolkit.avatars = config;
    return next;
  }
  function revengeFontsModule() {
    try {
      return findByProps("selectFont", "fonts")
        ?? find?.(value => typeof value?.selectFont === "function" && value?.fonts && typeof value.fonts === "object")
        ?? null;
    } catch { return null; }
  }
  function revengeFontNames() {
    const module = revengeFontsModule();
    if (!module?.fonts) return [];
    try {
      return Object.keys(module.fonts).filter(name => !name.startsWith("__") && plainObject(module.fonts[name])).sort((a, b) => a.localeCompare(b));
    } catch { return []; }
  }
  function currentRevengeFont() {
    try {
      const selected = revengeFontsModule()?.fonts?.__selected;
      return typeof selected === "string" && selected ? selected : null;
    } catch { return null; }
  }
  function themeFontConfig(theme = currentTheme()) {
    const config = themeData(theme)?.themeToolkit?.font;
    if (!plainObject(config) || config.mode === "inherit") return { mode: "inherit", name: null };
    if (config.mode === "default") return { mode: "default", name: null };
    return config.mode === "revenge" && typeof config.name === "string" && config.name ? { mode: "revenge", name: config.name } : { mode: "inherit", name: null };
  }
  function changeThemeFont(document, value) {
    const next = cloneThemeValue(document);
    next.data.themeToolkit ??= {};
    if (value === "inherit") next.data.themeToolkit.font = { mode: "inherit" };
    else if (value === "default") next.data.themeToolkit.font = { mode: "default" };
    else if (typeof value === "string" && value.startsWith("font:")) next.data.themeToolkit.font = { mode: "revenge", name: value.slice(5) };
    return next;
  }
  async function selectRevengeFont(name) {
    const module = revengeFontsModule();
    if (typeof module?.selectFont !== "function") return false;
    if (name && !module.fonts?.[name]) return false;
    await Promise.resolve(module.selectFont(name ?? null));
    return true;
  }
  async function applyThemeFont(theme = currentTheme()) {
    const config = themeFontConfig(theme);
    if (config.mode === "inherit") return true;
    const desired = config.mode === "default" ? null : config.name;
    if (currentRevengeFont() === desired) return true;
    return selectRevengeFont(desired);
  }
  function rewriteReactTree(node, visitor) {
    if (Array.isArray(node)) return node.map(child => rewriteReactTree(child, visitor));
    if (!React.isValidElement(node)) return node;
    let current = visitor(node);
    if (current === null) return null;
    if (!React.isValidElement(current)) current = node;
    const children = current.props?.children;
    if (children == null) return current;
    const nextChildren = rewriteReactTree(children, visitor);
    return nextChildren === children ? current : React.cloneElement(current, { children: nextChildren });
  }

  function tintInterfaceIconTree(node, color) {
    if (Array.isArray(node)) return node.map(child => tintInterfaceIconTree(child, color));
    if (!React.isValidElement(node)) return node;
    const props = node.props ?? {};
    const next = {};
    if (own(props, "color") || props.source != null) { next.color = color; next.style = [props.style, { tintColor: color }]; }
    if (props.children != null) next.children = tintInterfaceIconTree(props.children, color);
    return Object.keys(next).length ? React.cloneElement(node, next) : node;
  }
  function ToolkitPopupBackground({ style }) {
    return bh(RN.View, { accessible: false, pointerEvents: "none", style });
  }
  function patchBuilderSurfaces() {
    const patches = [];
    const patchExport = (name, kind, callback) => {
      try {
        const matchesSheet = value => {
          const component = value?.BottomSheet;
          const target = componentRenderTarget(component);
          const render = target ? target[0][target[1]] : component;
          return typeof render === "function" && String(render).includes("backgroundStyles") && String(render).includes("bodyStyles");
        };
        const module = name === "BottomSheet" ? find?.(matchesSheet) ?? findByProps(name) : findByProps(name);
        if (name === "BottomSheet" && !matchesSheet(module)) return false;
        const component = module?.[name];
        const target = componentRenderTarget(component) ?? (typeof component === "function" ? [module, name] : null);
        if (!target) return false;
        patches.push(kind(target[1], target[0], callback));
        return true;
      } catch { return false; }
    };
    patchExport("TableRowArrow", after, (_args, result) => {
      const color = interfaceIconColor();
      return color ? tintInterfaceIconTree(result, color) : result;
    });
    patchExport("TableRowIcon", after, (args, result) => {
      const color = interfaceIconColor();
      const variant = args[0]?.variant ?? "default";
      return color && ["default", "secondary"].includes(variant) ? tintInterfaceIconTree(result, color) : result;
    });
    const applyPopupBackground = args => {
      popupSurfaceStats.calls++;
      const props = args[0];
      const color = popupBackgroundColor();
      if (!color || !props || props.backgroundComponent != null) return false;
      args[0] = { ...props, showGradient: false, backgroundComponent: ToolkitPopupBackground,
        backgroundStyles: [props.backgroundStyles, { backgroundColor: color }],
        contentStyles: [props.contentStyles, { backgroundColor: "transparent" }],
        bodyStyles: [props.bodyStyles, { backgroundColor: "transparent" }] };
      popupSurfaceStats.applied++;
      return true;
    };
    // Message long-press menus render through ActionSheet first. Patch that
    // public surface directly, then retain BottomSheet as a fallback for other
    // ordinary sheets. A custom background component remains untouched.
    const actionSheetHooked = patchExport("ActionSheet", before, args => { applyPopupBackground(args); });
    const bottomSheetHooked = patchExport("BottomSheet", before, args => {
      if (args[0]?.backgroundComponent === ToolkitPopupBackground) return;
      applyPopupBackground(args);
    });
    popupSurfaceStats.hooked = actionSheetHooked || bottomSheetHooked;
    const componentSource = component => {
      try {
        const target = componentRenderTarget(component);
        const fn = target ? target[0]?.[target[1]] : typeof component === "function" ? component : null;
        return typeof fn === "function" ? String(fn) : "";
      } catch { return ""; }
    };
    const patchDefaultBySource = (needles, kind, callback) => {
      try {
        const module = find?.(value => {
          const source = componentSource(value?.default);
          return source && needles.every(needle => source.includes(needle));
        });
        const component = module?.default;
        const target = componentRenderTarget(component) ?? (typeof component === "function" ? [module, "default"] : null);
        if (!target) return false;
        patches.push(kind(target[1], target[0], callback));
        return true;
      } catch { return false; }
    };
    const messageRowStat = avatarRuntimeStats.messageRows;
    if (typeof MessageRowGenerator?.generateMessageRowData === "function") {
      messageRowStat.found = true;
      try {
        patches.push(after("generateMessageRowData", MessageRowGenerator, (args, result) => {
          messageRowStat.calls++;
          try {
            const message = args[0]?.message;
            if (!message || !result?.message) return result;
            const channel = ChannelStore?.getChannel?.(message.channel_id ?? message.channelId);
            const privateChannel = !!channel?.isPrivate?.();
            const config = toolkitAvatarConfig()[privateChannel ? "messageDM" : "messageServer"];
            if (!config.show) {
              delete result.message.avatarURL;
              if (own(result.message, "avatarDecorationURL")) delete result.message.avatarDecorationURL;
              messageRowStat.applied++;
            }
          } catch (error) { messageRowStat.error = String(error?.message ?? error).slice(0, 120); }
          return result;
        }));
        messageRowStat.hooked = true;
      } catch (error) { messageRowStat.error = String(error?.message ?? error).slice(0, 120); }
    } else messageRowStat.error = "generateMessageRowData unavailable";

    const exactMetro = globalThis.bunny?.metro;
    avatarRuntimeStats.exactAPI = !!(exactMetro?.filters?.byFilePath && exactMetro?.findExports);
    const exactModule = path => {
      if (!avatarRuntimeStats.exactAPI) return null;
      try { return exactMetro.findExports(exactMetro.filters.byFilePath(path, false)); }
      catch { return null; }
    };
    const patchTarget = (component, kind, callback) => {
      const target = componentRenderTarget(component);
      if (!target || typeof target[0]?.[target[1]] !== "function") return null;
      const unpatch = kind(target[1], target[0], callback);
      patches.push(unpatch);
      return unpatch;
    };

    // Native chat: DCDMessageView does not expose a row inset. Move the
    // Android DCDChatList itself into the vacated 40px avatar + 16px padding
    // column while message avatars are disabled. This does not alter Discord's
    // compact/cozy account setting.
    const chatLayoutStat = avatarRuntimeStats.chatLayout;
    const chatListWrapperCache = new WeakMap();
    const selectedAvatarlessChat = () => {
      try {
        const channelId = SelectedChannelStore?.getChannelId?.(null) ?? SelectedChannelStore?.getChannelId?.();
        const channel = ChannelStore?.getChannel?.(channelId);
        if (!channel) return false;
        const privateChannel = !!channel.isPrivate?.();
        return !toolkitAvatarConfig()[privateChannel ? "messageDM" : "messageServer"].show;
      } catch { return false; }
    };
    const wrappedChatList = original => {
      let Wrapped = chatListWrapperCache.get(original);
      if (Wrapped) return Wrapped;
      Wrapped = function ThemeToolkitAvatarlessChatList(props) {
        const rendered = original(props);
        if (!selectedAvatarlessChat()) return rendered;
        let shifted = false;
        const output = rewriteReactTree(rendered, node => {
          if (shifted) return node;
          const nodeProps = node.props ?? {};
          if (nodeProps.floatingChatInputEnabled === true) {
            shifted = true;
            chatLayoutStat.applied++;
            return React.cloneElement(node, { style: [nodeProps.style, { marginLeft: -56 }] });
          }
          return node;
        });
        if (!shifted) chatLayoutStat.error = "DCDChatList native child not found";
        else chatLayoutStat.error = null;
        return output;
      };
      Wrapped.displayName = "ThemeToolkitAvatarlessChatList";
      chatListWrapperCache.set(original, Wrapped);
      return Wrapped;
    };
    try {
      const chatModule = exactModule("modules/chat/native/Chat.android.tsx");
      const target = componentRenderTarget(chatModule?.default);
      chatLayoutStat.found = !!target;
      if (target) {
        patches.push(after(target[1], target[0], (_args, result) => {
          chatLayoutStat.calls++;
          try {
            if (!React.isValidElement(result) || !selectedAvatarlessChat()) return result;
            const children = React.Children.toArray(result.props?.children);
            if (!children.length) return result;
            let replaced = false;
            const nextChildren = children.map((child, index) => {
              if (replaced || index !== 0 || !React.isValidElement(child) || typeof child.type !== "function") return child;
              replaced = true;
              const Wrapped = wrappedChatList(child.type);
              return React.createElement(Wrapped, { ...child.props, key: child.key ?? "theme-toolkit-chat-list" });
            });
            if (!replaced) {
              chatLayoutStat.error = "DCDChatList composite child not found";
              return result;
            }
            chatLayoutStat.hooked = true;
            chatLayoutStat.error = null;
            return React.cloneElement(result, {}, nextChildren);
          } catch (error) {
            chatLayoutStat.error = String(error?.message ?? error).slice(0, 120);
            return result;
          }
        }));
        chatLayoutStat.hooked = true;
      } else chatLayoutStat.error = "Chat.android render target unavailable";
    } catch (error) { chatLayoutStat.error = String(error?.message ?? error).slice(0, 120); }

    // DM list: hook the optimized exported row that MessagesFastestList actually
    // renders, then patch the inner memo and Base component from the live React
    // elements they return. This avoids stale imported-export references.
    const dmFastStat = avatarRuntimeStats.dmFast;
    const dmBaseStat = avatarRuntimeStats.dmBase;
    const dmContentStat = avatarRuntimeStats.dmContent;
    let dmInnerUnpatch = null;
    let dmBaseUnpatch = null;
    let dmContentUnpatch = null;
    const patchLiveDMContent = component => {
      if (dmContentUnpatch) return true;
      const target = componentRenderTarget(component);
      dmContentStat.found = !!target;
      if (!target) { dmContentStat.error = "Live content target unavailable"; return false; }
      try {
        dmContentUnpatch = after(target[1], target[0], (_args, result) => {
          dmContentStat.calls++;
          try {
            const config = toolkitAvatarConfig().dmList;
            if (config.show || !config.usernameSize) return result;
            let changed = false;
            const output = rewriteReactTree(result, node => {
              if (changed) return node;
              const props = node.props ?? {};
              if (props.lineClamp === 1 && props.ellipsizeMode === "tail") {
                changed = true;
                return React.cloneElement(node, { style: [props.style, { fontSize: config.usernameSize }] });
              }
              return node;
            });
            if (changed) dmContentStat.applied++;
            return output;
          } catch (error) { dmContentStat.error = String(error?.message ?? error).slice(0, 120); return result; }
        });
        patches.push(dmContentUnpatch);
        dmContentStat.hooked = true;
        return true;
      } catch (error) { dmContentStat.error = String(error?.message ?? error).slice(0, 120); return false; }
    };
    const patchLiveDMBase = component => {
      if (dmBaseUnpatch) return true;
      const target = componentRenderTarget(component);
      dmBaseStat.found = !!target;
      if (!target) { dmBaseStat.error = "Live base target unavailable"; return false; }
      try {
        dmBaseUnpatch = after(target[1], target[0], (_args, result) => {
          dmBaseStat.calls++;
          try {
            const config = toolkitAvatarConfig().dmList;
            let removed = false;
            const output = rewriteReactTree(result, node => {
              const props = node.props ?? {};
              // Capture the live content renderer before React descends into it.
              if (props.channel && own(props, "favorite") && own(props, "resolvedUnreadSetting") && own(props, "hasNameplate")) {
                patchLiveDMContent(node.type);
                return node;
              }
              if (!config.show) {
                // Remove the entire CutoutBackgroundProvider+avatar branch so
                // status/decorations and their reserved width disappear together.
                const child = props.children;
                const childProps = React.isValidElement(child) ? child.props ?? {} : null;
                if (own(props, "backgroundColor") && childProps?.channel && own(childProps, "isStreaming") && own(childProps, "status") && own(childProps, "hasUnreadMessages")) {
                  removed = true;
                  return null;
                }
                // Fallback if Discord stops wrapping the avatar in the provider.
                if (props.channel && own(props, "isStreaming") && own(props, "status") && own(props, "hasUnreadMessages") && own(props, "blocked") && !own(props, "favorite")) {
                  removed = true;
                  return null;
                }
              }
              return node;
            });
            if (removed) dmBaseStat.applied++;
            return output;
          } catch (error) { dmBaseStat.error = String(error?.message ?? error).slice(0, 120); return result; }
        });
        patches.push(dmBaseUnpatch);
        dmBaseStat.hooked = true;
        return true;
      } catch (error) { dmBaseStat.error = String(error?.message ?? error).slice(0, 120); return false; }
    };
    const patchLiveDMInner = component => {
      if (dmInnerUnpatch) return true;
      const target = componentRenderTarget(component);
      if (!target) { dmFastStat.error = "Live inner target unavailable"; return false; }
      try {
        dmInnerUnpatch = after(target[1], target[0], (_args, result) => {
          try { if (React.isValidElement(result)) patchLiveDMBase(result.type); }
          catch (error) { dmFastStat.error = String(error?.message ?? error).slice(0, 120); }
          return result;
        });
        patches.push(dmInnerUnpatch);
        return true;
      } catch (error) { dmFastStat.error = String(error?.message ?? error).slice(0, 120); return false; }
    };
    try {
      const messagesItemModule = exactModule("modules/main_tabs_v2/native/tabs/messages/items/MessagesItemChannel.tsx");
      const fast = messagesItemModule?.MessagesItemChannelFast;
      const target = componentRenderTarget(fast);
      dmFastStat.found = !!target;
      if (target) {
        patches.push(after(target[1], target[0], (_args, result) => {
          dmFastStat.calls++;
          try {
            if (React.isValidElement(result) && patchLiveDMInner(result.type)) dmFastStat.applied++;
          } catch (error) { dmFastStat.error = String(error?.message ?? error).slice(0, 120); }
          return result;
        }));
        dmFastStat.hooked = true;
      } else dmFastStat.error = "MessagesItemChannelFast unavailable";
    } catch (error) { dmFastStat.error = String(error?.message ?? error).slice(0, 120); }

    return patches;
  }
  function BuilderInterfaceIcons({ document, update }) {
    const enabled = document.data.themeToolkit?.interfaceIcons?.enabled === true;
    return bh(RN.View, { style: BUI.panel },
      bh(RN.View, { style: { ...BUI.row, justifyContent: "space-between" } },
        bh(RN.Text, { style: BUI.label }, "Custom icon color"),
        bh(RN.Switch, { accessibilityLabel: "Custom icon color", value: enabled, onValueChange: value => update(current => setInterfaceIconsEnabled(current, value)) })),
      bh(RN.Text, { style: BUI.text }, "Settings, arrows, home, search, bell, call, video and other interface icons. Status and warning colors stay separate."),
      enabled ? bh(BuilderColor, { label: "Icon color", value: document.data.themeToolkit.interfaceIcons.color,
        onChange: value => update(current => changeInterfaceIconColor(current, value)) }) : null);
  }
  const BUI = {
    page: { padding: 16, paddingBottom: 28, gap: 14, backgroundColor: "#000000" },
    panel: { padding: 14, borderRadius: 14, backgroundColor: "#131315", borderWidth: 1, borderColor: "#303035", gap: 12 },
    row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    heading: { color: "#F5F5F7", fontSize: 23, fontWeight: "700", flexShrink: 1 },
    label: { color: "#F5F5F7", fontSize: 15, fontWeight: "600", flexShrink: 1 },
    text: { color: "#B5B5BF", fontSize: 13, lineHeight: 19 },
    input: { color: "#FFFFFF", backgroundColor: "#1C1C20", borderColor: "#484850", borderWidth: 1, borderRadius: 9, padding: 10, fontSize: 16, minHeight: 44 },
    rule: { borderTopColor: "#303035", borderTopWidth: 1, paddingTop: 12, gap: 12 },
  };
  const bh = (...args) => React.createElement(...args);
  function BuilderButton({ label, onPress, primary = false, danger = false, disabled = false, compact = false }) {
    return bh(RN.Pressable, { onPress, disabled, accessibilityRole: "button", accessibilityLabel: label,
      style: { minHeight: 44, maxWidth: "100%", paddingVertical: 10, paddingHorizontal: compact ? 10 : 14, borderRadius: 9, borderWidth: 1, borderColor: "#44444C", backgroundColor: primary ? "#F1F1F4" : "#202025", opacity: disabled ? 0.45 : 1, alignItems: "center", justifyContent: "center" } },
    bh(RN.Text, { style: { color: danger ? "#FF999F" : primary ? "#17171B" : "#F5F5F7", fontSize: 14, fontWeight: "600", flexShrink: 1 } }, label));
  }
  function BuilderChoice({ label, value, options, onChange }) {
    const [open, setOpen] = React.useState(false);
    const selected = options.find(option => option.value === value);
    return bh(RN.View, { style: { gap: 6 } },
      bh(RN.View, { style: { ...BUI.row, flexWrap: "nowrap", justifyContent: "space-between" } },
        bh(RN.Text, { style: { ...BUI.label, flex: 1 } }, label),
        bh(RN.View, { style: { flexShrink: 1, maxWidth: "62%" } }, bh(BuilderButton, { label: `${selected?.label ?? "Theme"} ›`, compact: true, onPress: () => setOpen(true) }))),
      open ? bh(RN.Modal, { transparent: true, visible: true, animationType: "fade", onRequestClose: () => setOpen(false) },
        bh(RN.View, { style: { flex: 1, backgroundColor: "#000000CC", justifyContent: "center", padding: 22 } },
          bh(RN.View, { style: { ...BUI.panel, maxHeight: "85%" } },
            bh(RN.Text, { style: BUI.heading }, label),
            bh(RN.ScrollView, { contentContainerStyle: { gap: 3 } }, options.map(option => bh(RN.Pressable, {
              key: String(option.value), accessibilityRole: "radio", accessibilityState: { selected: option.value === value },
              onPress: () => { onChange(option.value); setOpen(false); }, style: { ...BUI.row, minHeight: 48, padding: 10, borderRadius: 8, backgroundColor: option.value === value ? "#34343C" : "#131315" },
            }, bh(RN.Text, { style: BUI.label }, `${option.value === value ? "●" : "○"}  ${option.label}`)))),
            bh(BuilderButton, { label: "Close", onPress: () => setOpen(false) })))) : null);
  }
  function BuilderColor({ label, value, onChange, optional = true, onFocus, help }) {
    const [text, setText] = React.useState(String(value ?? ""));
    React.useEffect(() => setText(String(value ?? "")), [value]);
    const commit = input => { setText(input); onChange(input); };
    const pick = () => {
      const picker = ColorPickerActionSheet?.default;
      if (typeof picker !== "function") { toast("Color picker unavailable. Enter a hex color instead."); return; }
      const alpha = colorValue(value)?.length === 9 ? colorValue(value).slice(7) : "";
      try { picker({ color: tagColorInt(stripAlpha(value) ?? "#FFFFFF") ?? 0xFFFFFF, onSelect: color => {
        const hex = `#${(Number(color) >>> 0 & 0xFFFFFF).toString(16).padStart(6, "0")}`.toUpperCase();
        commit(hex + alpha);
      } }); } catch { toast("Could not open the color picker"); }
    };
    return bh(RN.View, { style: { gap: 6 } },
      bh(RN.Text, { style: BUI.label }, label),
      help ? bh(RN.Text, { style: { ...BUI.text, fontSize: 12 } }, help) : null,
      bh(RN.View, { style: { ...BUI.row, flexWrap: "nowrap" } },
        bh(RN.Pressable, { onPress: () => { onFocus?.(); pick(); }, accessibilityRole: "button", accessibilityLabel: `Pick ${label}`, style: { width: 44, height: 44, borderRadius: 9, backgroundColor: colorValue(text) ?? "#202025", borderWidth: 1, borderColor: "#787882" } }),
        bh(RN.TextInput, { value: text, onFocus, onChangeText: commit, onEndEditing: () => { if (text.trim() && colorValue(text)) commit(colorValue(text)); },
          accessibilityLabel: label, placeholder: optional ? "Theme / Discord default" : "#RRGGBB", placeholderTextColor: "#85858F", autoCapitalize: "characters", autoCorrect: false, maxLength: 32, style: { ...BUI.input, flex: 1 } })));
  }
  function BuilderExpand({ label, children, initial = false }) {
    const [open, setOpen] = React.useState(initial);
    return bh(RN.View, { style: { gap: 12 } }, bh(BuilderButton, { label: `${label} ${open ? "⌃" : "⌄"}`, onPress: () => setOpen(!open) }), open ? children : null);
  }
  function choices(items, includeTheme = false) {
    return [...(includeTheme ? [{ value: "theme", label: "Theme" }] : []), ...items.map(item => Array.isArray(item) ? { value: item[0], label: item[1] } : { value: item, label: item[0].toUpperCase() + item.slice(1) })];
  }
  const SOURCE_CHOICES = [{ value: "theme", label: "Theme / Auto" }, { value: "toolkit", label: "Toolkit" }, { value: "discord", label: "Discord" }];
  function BuilderAppearanceChoice({ document, change, setting, label, options = SOURCE_CHOICES }) {
    return bh(BuilderChoice, { label, value: document.values[setting], options, onChange: value => change(setting, value) });
  }
  function BuilderAppearanceColor({ document, change, setting, label }) {
    return bh(BuilderColor, { label, value: document.values[setting], onChange: value => change(setting, value) });
  }

  function BuilderFontEditor({ document, update }) {
    const config = themeFontConfig({ data: document.data });
    const names = revengeFontNames();
    const current = currentRevengeFont();
    const value = config.mode === "revenge" ? `font:${config.name}` : config.mode;
    const options = [
      { value: "inherit", label: "Follow current Revenge font" },
      { value: "default", label: "Discord default font" },
      ...names.map(name => ({ value: `font:${name}`, label: name })),
    ];
    if (config.mode === "revenge" && config.name && !names.includes(config.name)) options.push({ value: `font:${config.name}`, label: `${config.name} (not installed)` });
    return bh(RN.View, { style: { gap: 14 } },
      bh(RN.View, { style: BUI.panel },
        bh(RN.Text, { style: BUI.label }, "Revenge font"),
        bh(RN.Text, { style: BUI.text }, "Links this Toolkit theme to an existing Revenge font. Revenge still handles downloading and loading the font files."),
        revengeFontsModule() ? bh(BuilderChoice, { label: "Theme font", value, options, onChange: next => update(current => changeThemeFont(current, next)) }) : bh(RN.Text, { style: { ...BUI.text, color: "#FFCA80" } }, "Revenge's font module was not found on this build."),
        bh(RN.Text, { style: BUI.text }, `Currently active in Revenge: ${current ?? "Discord default"}`),
        config.mode === "revenge" && config.name && !names.includes(config.name) ? bh(RN.Text, { style: { ...BUI.text, color: "#FFCA80" } }, "That linked font is not installed. Install it in Revenge → Fonts first; Toolkit will not download fonts itself.") : null));
  }
  function BuilderAvatarSurface({ title, surface, document, update, username = false, help }) {
    const config = toolkitAvatarConfig({ data: document.data })[surface];
    const usernameOptions = USERNAME_SIZE_VALUES.map(value => ({ value, label: `${value} px` }));
    return bh(RN.View, { style: BUI.panel },
      bh(RN.View, { style: { ...BUI.row, flexWrap: "nowrap", justifyContent: "space-between" } },
        bh(RN.Text, { style: { ...BUI.label, flex: 1 } }, title),
        bh(RN.Switch, { accessibilityLabel: `${title} avatars`, value: config.show, onValueChange: value => update(current => changeAvatarSurface(current, surface, "show", value)) })),
      help ? bh(RN.Text, { style: BUI.text }, help) : null,
      username && !config.show ? bh(BuilderChoice, { label: "Name font size", value: config.usernameSize, options: usernameOptions, onChange: value => update(current => changeAvatarSurface(current, surface, "usernameSize", value)) }) : null);
  }
  function BuilderAvatarsEditor({ document, update }) {
    return bh(RN.View, { style: { gap: 14 } },
      bh(BuilderAvatarSurface, { title: "DM list", surface: "dmList", document, update, username: true, help: "Show or hide DM avatars. Discord keeps its normal DM-row spacing. Only the conversation-name font size is adjustable." }),
      bh(BuilderAvatarSurface, { title: "Inside DMs", surface: "messageDM", document, update, help: "Show or hide message avatars in DMs and group DMs. Hidden avatars also reclaim the native chat gutter." }),
      bh(BuilderAvatarSurface, { title: "Inside server channels", surface: "messageServer", document, update, help: "Show or hide avatars beside server messages and reclaim the native chat gutter. Server icons are untouched." }));
  }

  // Sample components resolve the draft explicitly. They never select a theme,
  // write appearance settings or use the live renderer's image-failure cache.
  function builderPreviewModel(document) {
    const read = (section, index, fallback) => groupValue(document, ...BUILDER_COLORS[section][index].slice(1)) || fallback;
    const theme = { data: document.data };
    const c = {
      app: read("backgrounds", 0, "#313338"), chat: read("backgrounds", 1, read("backgrounds", 0, "#313338")),
      sidebar: read("backgrounds", 2, "#2B2D31"), card: read("backgrounds", 3, "#232428"),
      input: read("backgrounds", 4, "#383A40"), settings: read("backgrounds", 0, "#313338"),
      menu: popupBackgroundColor(theme) ?? read("backgrounds", 0, "#313338"),
      nav: groupValue(document, "MOBILE_FLOATINGBAR_BACKGROUND TAB_BAR_BACKGROUND") || "#232428",
      text: read("text", 0, "#DBDEE1"), heading: read("text", 1, "#F2F3F5"), secondary: read("text", 2, "#B5BAC1"),
      muted: read("text", 3, "#949BA4"), channel: read("text", 4, "#949BA4"), link: read("text", 5, "#00A8FC"),
      icon: interfaceIconColor(theme) ?? (groupValue(document, "INTERACTIVE_ICON_DEFAULT INTERACTIVE_NORMAL CHANNEL_ICON ICON_PRIMARY", "PRIMARY_200") || "#B5BAC1"),
      activeIcon: interfaceIconColor(theme) ?? (groupValue(document, "INTERACTIVE_ACTIVE INTERACTIVE_HOVER ICON_STRONG") || "#FFFFFF"),
      mutedIcon: interfaceIconColor(theme) ?? (groupValue(document, "INTERACTIVE_MUTED ICON_MUTED") || "#4E5058"),
      brand: read("accents", 0, "#5865F2"), button: read("accents", 1, "#5865F2"), buttonText: read("accents", 2, "#FFFFFF"),
      secondaryButton: read("accents", 3, "#4E5058"), selected: read("accents", 4, "#4E505899"),
      border: groupValue(document, "BORDER_SUBTLE BORDER_FAINT BORDER_MUTED CARD_BORDER_DEFAULT") || "#FFFFFF14",
      strongBorder: groupValue(document, "APP_FRAME_BORDER BORDER_STRONG BORDER_NORMAL") || "#FFFFFF33",
      buttonBorder: groupValue(document, "CONTROL_SECONDARY_BORDER_DEFAULT REDESIGN_BUTTON_SECONDARY_BORDER") || "#FFFFFF1A",
      positive: read("accents", 6, "#23A559"), warning: read("accents", 7, "#F0B232"), danger: read("accents", 8, "#F23F43"),
    };
    const ui = effectiveUIAccentConfig(document.values, theme);
    const mention = effectiveMentionConfig(document.values, theme);
    const tag = effectiveMentionTagConfig(document.values, theme);
    return { ...c, primaryButtonBorder: groupValue(document, "CONTROL_PRIMARY_BORDER_DEFAULT") || c.buttonBorder,
      composer: groupValue(document, "MOBILE_CHATINPUT_BACKGROUND_DEFAULT CHAT_INPUT_BACKGROUND CHANNELTEXTAREA_BACKGROUND") || c.input,
      composerBorder: groupValue(document, "MOBILE_CHATINPUT_BORDER_DEFAULT INPUT_BORDER_DEFAULT") || c.border,
      rail: groupValue(document, "BACKGROUND_BASE_LOWEST BG_BASE_TERTIARY BACKGROUND_TERTIARY") || c.sidebar, ui, mention, tag,
      mentionText: effectiveMentionTextColor(mention, document.values, theme) ?? c.text,
      mentionBackground: mention.background ?? colorValue(document.data.semanticColors?.MESSAGE_MENTIONED_BACKGROUND_DEFAULT) ?? colorValue(document.data.semanticColors?.BACKGROUND_MENTIONED) ?? "#F0B2321A",
      mentionLine: mention.line ?? colorValue(document.data.semanticColors?.MENTION_FOREGROUND) ?? "#F0B232",
      tagColor: (tag.mode === "gradient" ? (tag.gradient.length >= 2 ? tag.gradient[0] : null) : tag.color) ?? colorValue(document.data.semanticColors?.MENTION_FOREGROUND) ?? c.brand,
      reaction: ui.reaction ?? colorValue(document.data.semanticColors?.REACTION_BACKGROUND_REACTED_DEFAULT) ?? withAlpha(c.brand, 0.18),
      reactionText: ui.reaction ? autoContrastText(ui.reaction, c.chat) : c.brand,
      folderAccent: (document.values.folderColorSource === "toolkit" ? colorValue(document.values.folderAccent) : document.values.folderColorSource === "theme" ? themeFolderConfig(theme).accent : null) ?? c.icon,
    };
  }
  function previewText(id, text, color, style = {}) {
    return bh(RN.Text, { testID: `tt-preview-${id}`, style: { fontSize: 12, lineHeight: 17, color, flexShrink: 1, ...style } }, text);
  }
  function BuilderPreviewIcon({ document, slot, color, size = 21 }) {
    const [failed, setFailed] = React.useState(null);
    const [nativeFailed, setNativeFailed] = React.useState(null);
    const image = effectiveIconImage(slot, document.values, { data: document.data });
    const extraName = { call: "PhoneCallIcon", video: "VideoIcon", back: "ChevronSmallLeftIcon" }[slot];
    const alias = ICON_ALIASES.find(item => item.slot === (slot.startsWith("folder") ? "folder" : slot) && item.assetId != null)
      ?? (extraName ? { assetId: getAssetIDByName?.(extraName) } : null);
    let nativeURI = null;
    try { nativeURI = alias ? RN.Image?.resolveAssetSource?.(alias.assetId)?.uri : null; } catch {}
    const uri = image && failed !== image.uri ? image.uri : nativeURI && nativeFailed !== nativeURI ? nativeURI : null;
    const custom = !!image && uri === image.uri;
    return uri ? bh(RN.Image, { testID: `tt-preview-icon-${slot}`, accessible: false, source: { uri }, resizeMode: "contain", fadeDuration: 0,
      style: { width: size, height: size, tintColor: custom && !image.tint ? null : stripAlpha(color) ?? color },
      onError: () => custom ? setFailed(uri) : setNativeFailed(uri),
    }) : previewText(`icon-${slot}`, "Native", color, { fontSize: 9, lineHeight: 12 });
  }
  function BuilderPreviewFolder({ document, state, compact = false, model = builderPreviewModel(document) }) {
    const cfg = themeFolderConfig({ data: document.data });
    const values = document.values;
    const outline = effectiveOutline(cfg[state], state, true, values);
    const shared = values[`${state}FolderBackgroundSource`] === "shared";
    const source = shared ? values.folderColorSource : values[`${state}FolderBackgroundSource`];
    const fill = source === "toolkit" ? colorValue(values[shared ? "folderBackground" : `${state}FolderBackground`])
      : source === "theme" ? colorValue(document.data.themeToolkit?.folders?.[state]?.background) ?? cfg.background : null;
    const cover = values.folderCoverMode === "theme" ? cfg.cover : values.folderCoverMode;
    const size = compact ? 40 : 56;
    const style = { width: size, height: state === "closed" ? size : compact ? 96 : 110, borderRadius: compact ? 11 : 15,
      backgroundColor: fill ?? "#333333", alignItems: "center", justifyContent: "center", gap: 7 };
    const previews = bh(RN.View, { style: { width: compact ? 26 : 36, flexDirection: "row", flexWrap: "wrap", gap: 4 } }, [0, 1, 2, 3].map(i => bh(RN.View, {
      key: i, style: { width: compact ? 11 : 16, height: compact ? 11 : 16, borderRadius: 8, backgroundColor: i % 2 ? model.muted : model.secondary },
    })));
    return bh(RN.View, { testID: `tt-preview-folder-${state}`, style },
      state === "closed" && cover === "preview" ? previews : bh(BuilderPreviewIcon, { document, slot: state === "closed" ? "folderClosed" : "folderOpen", color: model.folderAccent, size: compact ? 19 : 24 }),
      state === "open" ? ["N", "W"].map(letter => bh(RN.View, { key: letter, style: { width: compact ? 23 : 27, height: compact ? 23 : 27, borderRadius: 7, backgroundColor: model.card, alignItems: "center", justifyContent: "center" } }, previewText(`server-${letter}`, letter, model.heading))) : null,
      bh(OutlineVisual, { state, folder: {}, baseStyle: style, fallbackRadius: compact ? 11 : 15, outlineOverride: outline }));
  }
  function BuilderPreviewMention({ document, model = builderPreviewModel(document) }) {
    const gradient = model.tag.mode === "gradient" && model.tag.gradient.length >= 2 ? model.tag.gradient : null;
    return bh(RN.View, { testID: "tt-preview-mention", style: { backgroundColor: model.mentionBackground, borderLeftColor: model.mentionLine, borderLeftWidth: 2, padding: 8, gap: 2 } },
      previewText("mention-author", "Alex mentioned you", model.heading, { fontWeight: "600" }),
      bh(RN.Text, { testID: "tt-preview-mention-text", style: { color: model.mentionText, fontSize: 12, lineHeight: 18 } },
        bh(RN.Text, { testID: "tt-preview-tag", style: { color: model.tagColor, backgroundColor: withAlpha(model.tagColor, 0.15), fontWeight: "600" } },
          gradient ? [..."@You"].map((letter, i) => bh(RN.Text, { key: i, style: { color: gradientAt(gradient, i / 3) } }, letter)) : "@You"),
        "  How does this look?"));
  }
  function BuilderPreviewReaction({ model }) {
    return bh(RN.View, { testID: "tt-preview-reaction", style: { alignSelf: "flex-start", backgroundColor: model.reaction, borderColor: model.reaction, borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 } },
      previewText("reaction-text", "♥  2", model.reactionText));
  }
  function BuilderMobilePreview({ document, compact = false, view, onViewChange }) {
    const [localView, setLocalView] = React.useState("chat");
    const screen = view ?? localView;
    const setView = onViewChange ?? setLocalView;
    const m = builderPreviewModel(document);
    const icon = (slot, size = 18) => bh(BuilderPreviewIcon, { document, slot, color: m.ui[`${slot}Icon`] ?? m.icon, size });
    const row = { flexDirection: "row", alignItems: "center", gap: 8 };
    const chat = bh(RN.View, { testID: "tt-preview-chat", style: { flex: 1, backgroundColor: m.chat, padding: 10, gap: compact ? 5 : 8 } },
      bh(RN.View, null, previewText("message-author", "Alex · just now", m.secondary, { fontSize: 10 }), previewText("message", "A message in your theme.", m.text)),
      !compact ? bh(BuilderPreviewMention, { document, model: m }) : null,
      bh(RN.View, { testID: "tt-preview-card", style: { backgroundColor: m.card, borderWidth: 1, borderColor: m.border, borderRadius: 8, padding: 7 } }, previewText("card-label", "Shared link", m.link)),
      !compact ? bh(BuilderPreviewReaction, { model: m }) : null,
      bh(RN.View, { testID: "tt-preview-input", style: { ...row, backgroundColor: m.composer, borderColor: m.composerBorder, borderWidth: 1, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 10, marginTop: "auto" } },
        previewText("input-add", "+", m.icon, { fontSize: 18 }), previewText("input-text", "Message #general", m.muted, { flex: 1 }), previewText("input-emoji", "☺", m.icon)));
    const channels = bh(RN.View, { style: { flexDirection: "row", flex: 1 } },
      bh(RN.View, { testID: "tt-preview-rail", style: { width: 56, alignItems: "center", backgroundColor: m.rail, gap: 8, paddingVertical: 8 } },
        icon("home", 22),
        bh(RN.View, { testID: "tt-preview-indicator", style: { borderLeftWidth: 3, borderLeftColor: m.ui.selectedGuild ?? m.activeIcon, width: "100%", alignItems: "center" } },
          bh(BuilderPreviewFolder, { document, state: "closed", compact: true, model: m })),
        !compact ? bh(BuilderPreviewFolder, { document, state: "open", compact: true, model: m }) : null),
      bh(RN.View, { testID: "tt-preview-sidebar", style: { flex: 1, minWidth: 0, backgroundColor: m.sidebar, borderTopLeftRadius: 14, borderLeftWidth: 1, borderColor: m.border, padding: 10, gap: 8 } },
        previewText("heading", "Your server ›", m.heading, { fontSize: 15, fontWeight: "700" }),
        bh(RN.View, { testID: "tt-preview-search-button", style: { ...row, borderWidth: 1, borderColor: m.buttonBorder, backgroundColor: m.secondaryButton, borderRadius: 12, padding: 5 } }, icon("search", 15), previewText("search", "Search", m.secondary)),
        !compact ? previewText("category", "⌄  TEXT CHANNELS", m.muted, { fontSize: 10, marginTop: 6 }) : null,
        bh(RN.View, { style: { padding: 6, borderRadius: 7, backgroundColor: m.selected } }, previewText("channel", "#  general", m.text)),
        !compact ? previewText("channel-other", "#  screenshots", m.channel, { padding: 6 }) : null,
        !compact ? previewText("channel-voice", "♪  Lounge", m.channel, { padding: 6 }) : null));
    return bh(RN.View, { style: { gap: 6 } },
      bh(RN.View, { accessibilityRole: "tablist", style: { flexDirection: "row", gap: 6 } }, [["chat", "Chat"], ["channels", "Channels"], ["settings", "Settings"], ["menu", "Popup"]].map(([key, label]) =>
        bh(RN.Pressable, { key, accessibilityRole: "tab", accessibilityLabel: `${label} preview`, accessibilityState: { selected: screen === key }, onPress: () => setView(key),
          style: { flex: 1, minHeight: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: screen === key ? "#34343C" : "#161619", borderWidth: 1, borderColor: screen === key ? "#A4A4AD" : "#303035" } },
        bh(RN.Text, { style: { ...BUI.label, fontSize: 12 } }, label)))),
      bh(RN.View, { testID: "tt-preview-app", pointerEvents: "none", style: { backgroundColor: m.app, borderColor: m.strongBorder, borderWidth: 1, borderRadius: 16, overflow: "hidden", minHeight: compact ? 186 : 320, width: "100%", maxWidth: 380, alignSelf: "center" } },
        screen !== "channels" && screen !== "settings" ? bh(RN.View, { style: { ...row, padding: 10, borderBottomWidth: 1, borderBottomColor: m.border } },
          previewText("back", "‹", m.icon, { fontSize: 23 }), previewText("heading", "# general", m.heading, { fontSize: 14, fontWeight: "700", flex: 1 }), icon("search"), icon("notification")) : null,
        screen === "settings" ? bh(RN.View, { testID: "tt-preview-settings", style: { flex: 1, backgroundColor: m.settings, padding: 12, gap: 10 } },
          bh(RN.View, { style: row }, previewText("settings-back", "‹", m.icon, { fontSize: 23 }), previewText("settings-heading", "Settings", m.heading, { fontWeight: "700" })),
          previewText("settings-section", "App Settings", m.secondary),
          [["call", "Voice"], ["settings", "Appearance"], ["notification", "Notifications"]].map(([slot, label]) => bh(RN.View, { key: slot, style: { ...row, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: m.border } },
            icon(slot), previewText(`settings-${slot}`, label, m.text, { flex: 1 }), previewText(`settings-arrow-${slot}`, "›", m.icon)))) : screen === "channels" ? channels : chat,
        screen === "channels" ? bh(RN.View, { testID: "tt-preview-nav", style: { ...row, margin: 6, padding: 7, borderRadius: 14, borderWidth: 1, borderColor: m.border, backgroundColor: m.nav } },
          bh(RN.View, { style: { width: 26, height: 26, borderRadius: 13, backgroundColor: m.brand, alignItems: "center", justifyContent: "center" } }, previewText("avatar", "Y", m.buttonText)),
          bh(RN.View, { style: { flex: 1 } }, previewText("user-name", "You", m.heading, { fontWeight: "600" }), !compact ? previewText("user-status", "● Online", m.positive, { fontSize: 10 }) : null),
          icon("notification"), icon("settings")) : null,
        screen === "menu" ? bh(RN.View, { testID: "tt-preview-menu-layer", style: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "#00000066", justifyContent: "flex-end" } },
          bh(RN.View, { testID: "tt-preview-menu", style: { backgroundColor: m.menu, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: m.strongBorder, padding: 12, gap: compact ? 7 : 12 } },
            bh(RN.View, { style: { alignSelf: "center", width: 30, height: 3, borderRadius: 2, backgroundColor: m.muted } }),
            previewText("menu-label", "Message options", m.heading, { fontWeight: "700" }),
            previewText("menu-reply", "↶  Reply", m.text), previewText("menu-copy", "▣  Copy text", m.text),
            !compact ? previewText("menu-reaction", "☺  Add reaction", m.text) : null)) : null));
  }
  function BuilderTextPreview({ document }) {
    const m = builderPreviewModel(document);
    return bh(RN.View, { pointerEvents: "none", style: { backgroundColor: m.chat, borderColor: m.border, borderWidth: 1, borderRadius: 10, padding: 10, gap: 3 } },
      bh(RN.View, { style: { ...BUI.row, justifyContent: "space-between" } }, previewText("heading", "Conversation heading", m.heading, { fontWeight: "700" }), previewText("channel", "# general", m.channel)),
      previewText("secondary", "Alex · Today at 12:00", m.secondary, { fontSize: 11 }),
      previewText("message", "This is how your message text looks.", m.text),
      bh(RN.View, { style: BUI.row }, previewText("link", "A shared link", m.link), previewText("muted", "Muted text", m.muted)),
      bh(RN.View, { style: BUI.row }, previewText("normal-icon", "# Normal", m.icon), previewText("active-icon", "# Active", m.activeIcon), previewText("muted-icon", "# Muted", m.mutedIcon)));
  }
  function BuilderIconsPreview({ document }) {
    const m = builderPreviewModel(document);
    return bh(RN.View, { pointerEvents: "none", style: { backgroundColor: m.app, borderColor: m.border, borderWidth: 1, borderRadius: 10, flexDirection: "row", flexWrap: "wrap", paddingVertical: 4 } },
      ICON_SLOTS.map(slot => bh(RN.View, { key: slot.key, style: { width: "25%", alignItems: "center", gap: 3, padding: 5 } },
        bh(BuilderPreviewIcon, { document, slot: slot.key, color: slot.key.startsWith("folder") ? m.folderAccent : m.ui[slot.accent] ?? m.icon }),
        previewText(`icon-label-${slot.key}`, slot.label, m.secondary, { fontSize: 9, lineHeight: 12, textAlign: "center" }))));
  }
  function BuilderAccentsPreview({ document }) {
    const m = builderPreviewModel(document);
    const badge = (id, label, color) => previewText(id, `● ${label}`, color, { fontSize: 10 });
    return bh(RN.View, { pointerEvents: "none", style: { backgroundColor: m.app, borderColor: m.strongBorder, borderWidth: 1, borderRadius: 10, padding: 8, gap: 6 } },
      bh(RN.View, { style: { ...BUI.row, justifyContent: "space-between" } },
        ["home", "search", "notification", "settings", "call", "video"].map(slot => bh(RN.View, { key: slot, style: { alignItems: "center", gap: 2 } },
          bh(BuilderPreviewIcon, { document, slot, color: m.ui[`${slot}Icon`] ?? m.icon, size: 19 }),
          previewText(`accent-label-${slot}`, slot === "notification" ? "Bell" : slot[0].toUpperCase() + slot.slice(1), m.secondary, { fontSize: 9 }))),
        bh(BuilderPreviewReaction, { model: m })),
      bh(RN.View, { testID: "tt-preview-selected", style: { backgroundColor: m.selected, borderLeftWidth: 3, borderLeftColor: m.ui.selectedGuild ?? m.activeIcon, borderRadius: 5, paddingHorizontal: 6 } }, previewText("selected-text", "# selected channel  ·  ● unread", m.text, { fontSize: 11 })),
      bh(RN.View, { style: BUI.row },
        bh(RN.View, { testID: "tt-preview-primary-button", style: { backgroundColor: m.button, borderColor: m.primaryButtonBorder, borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 } }, previewText("button-text", "Primary", m.buttonText, { fontSize: 11 })),
        bh(RN.View, { testID: "tt-preview-secondary-button", style: { backgroundColor: m.secondaryButton, borderColor: m.buttonBorder, borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 } }, previewText("secondary-button-text", "Search / Add Friends", m.text, { fontSize: 11 })),
        badge("brand", "Accent", m.brand)),
      bh(RN.View, { testID: "tt-preview-action-row", style: { backgroundColor: m.secondaryButton, borderColor: m.buttonBorder, borderWidth: 1, borderRadius: 8, padding: 6 } },
        previewText("action-row-label", "⚙  Manage channel access  ›", m.text, { fontSize: 11 })),
      bh(RN.View, { style: BUI.row }, badge("positive", "Online", m.positive), badge("warning", "Warning", m.warning), badge("danger", "Danger", m.danger)));
  }
  function BuilderAvatarsPreview({ document }) {
    const m = builderPreviewModel(document), config = toolkitAvatarConfig({ data: document.data });
    const row = (key, label, surface, size) => {
      const item = config[surface];
      return bh(RN.View, { key, style: { ...BUI.row, flexWrap: "nowrap", minHeight: 42 } },
        item.show ? bh(RN.View, { style: { width: size, height: size, borderRadius: size / 2, backgroundColor: m.brand, alignItems: "center", justifyContent: "center" } }, previewText(`${key}-avatar`, "A", m.buttonText, { fontSize: Math.max(9, size / 3) })) : null,
        previewText(`${key}-name`, label, m.heading, { fontSize: surface === "dmList" ? item.usernameSize : 14, fontWeight: "600", flex: 1 }));
    };
    return bh(RN.View, { pointerEvents: "none", style: { ...BUI.panel, backgroundColor: m.chat } },
      row("dm-list", "Alex — Direct Message", "dmList", 32),
      row("dm-message", "DM message · Alex", "messageDM", 40),
      row("server-message", "Server message · Alex", "messageServer", 40));
  }
  function BuilderFontPreview({ document }) {
    const config = themeFontConfig({ data: document.data });
    const label = config.mode === "inherit" ? "Follow current Revenge font" : config.mode === "default" ? "Discord default" : config.name;
    return bh(RN.View, { pointerEvents: "none", style: BUI.panel },
      bh(RN.Text, { style: BUI.label }, `Linked font: ${label}`),
      bh(RN.Text, { style: BUI.text }, "The actual font appears when you Preview/apply the theme because Revenge owns font loading."));
  }

  function BuilderDraftPreview({ document, section = "", view, onViewChange }) {
    const m = section === "mentions" ? builderPreviewModel(document) : null;
    return bh(RN.View, { testID: `tt-preview-${section || "overview"}`, style: { gap: 6 } },
      bh(RN.Text, { style: { ...BUI.text, fontSize: 11 } }, "Live sample · draft only"),
      !section || section === "backgrounds" ? bh(BuilderMobilePreview, { document, compact: !!section, view, onViewChange }) : null,
      section === "text" ? bh(BuilderTextPreview, { document }) : null,
      section === "accents" ? bh(BuilderAccentsPreview, { document }) : null,
      section === "icons" ? bh(BuilderIconsPreview, { document }) : null,
      section === "fonts" ? bh(BuilderFontPreview, { document }) : null,
      section === "avatars" ? bh(BuilderAvatarsPreview, { document }) : null,
      section === "folders" ? bh(BuilderFolderPreview, { document }) : null,
      section === "mentions" ? bh(RN.View, { style: { padding: 8, backgroundColor: m.chat, borderRadius: 10, gap: 6 } }, previewText("regular-message", "A regular message above the mention.", m.text), bh(BuilderPreviewMention, { document, model: m })) : null);
  }
  function BuilderFolderEditor({ document, change, state, setState }) {
    const values = document.values;
    const field = (setting, label) => bh(BuilderAppearanceColor, { key: setting, document, change, setting, label });
    const choice = (setting, label, options) => bh(BuilderAppearanceChoice, { key: setting, document, change, setting, label, options });
    const prefix = state, enabled = values[`${prefix}OutlineEnabled`], mode = values[`${prefix}OutlineColorMode`];
    const base = themeFolderConfig({ data: document.data });
    const effective = effectiveOutline(base[state], state, true, values);
    const sourceKey = `${state}FolderBackgroundSource`;
    const source = values[sourceKey] === "shared" ? values.folderColorSource : values[sourceKey];
    const backgroundKey = `${state}FolderBackground`;
    const backgroundValue = values[values[sourceKey] === "shared" ? "folderBackground" : backgroundKey];
    const changeBackground = value => { change(sourceKey, "toolkit"); change(backgroundKey, value); };
    return bh(RN.View, { style: { gap: 14 } },
      bh(RN.View, { style: BUI.row }, ["closed", "open"].map(item => bh(BuilderButton, { key: item, label: item === "closed" ? "Closed" : "Open", primary: item === state, onPress: () => setState(item) }))),
      bh(RN.View, { style: BUI.panel }, bh(BuilderExpand, { label: "Background" },
        bh(BuilderChoice, { label: "Background source", value: source, options: SOURCE_CHOICES, onChange: value => {
          change(sourceKey, value); if (values[sourceKey] === "shared") change(`${state}FolderBackground`, values.folderBackground);
        } }),
        source === "toolkit" ? bh(BuilderColor, { label: "Background color", value: backgroundValue, onChange: changeBackground }) : null,
        source === "toolkit" ? bh(BuilderChoice, { label: "Background opacity", value: Math.round(colorAlpha(backgroundValue) * 100), options: choices([[0, "Transparent"], [25, "25%"], [50, "50%"], [75, "75%"], [100, "Solid"]]), onChange: alpha => changeBackground(withAlpha(colorValue(backgroundValue) ?? "#000000", alpha / 100)) }) : null)),
      bh(RN.View, { style: BUI.panel },
        choice(`${prefix}OutlineEnabled`, "Outline", choices([[true, "On"], [false, "Off"]])),
        enabled ? bh(RN.View, { style: { gap: 14 } },
          choice(`${prefix}OutlineColorMode`, "Color mode", [{ value: "theme", label: "Theme / Auto" }, ...choices([["custom", "Custom"], ["rgb", "RGB"], ["rainbow", "Rainbow"], ["spectrum", "Full spectrum"], ["gradient", "Gradient"]])]),
          mode === "custom" ? field(`${prefix}OutlineColor`, "Outline color") : null,
          mode === "gradient" ? bh(RN.View, { style: { gap: 10 } }, [1, 2, 3].map(i => field(`${prefix}Gradient${i}`, `Gradient color ${i}${i === 3 ? " (optional)" : ""}`))) : null,
          choice(`${prefix}OutlinePattern`, "Pattern", choices(["solid", "dashed", "dotted", "segmented"], true)),
          choice(`${prefix}OutlineAnimation`, "Animation", choices([["none", "None"], ["pulse", "Pulse"], ["breathe", "Breathe"], ["glow", "Glow"], ["chase", "Chase"], ["marquee", "Marquee"], ["spin", "Color spin"]], true)),
          effective.animation === "chase" ? choice(`${prefix}OutlineTrail`, "Trail length", choices(["short", "medium", "long"])) : null,
          effective.animation !== "none" || ["rgb", "rainbow", "spectrum"].includes(effective.colorMode) ? choice(`${prefix}OutlineSpeed`, "Speed", choices(["slow", "normal", "fast"], true)) : null,
          bh(BuilderExpand, { label: "Thickness, brightness & glow" },
            choice(`${prefix}OutlineWidth`, "Thickness", choices([[1, "1 px"], [2, "2 px"], [3, "3 px"]], true)),
            choice(`${prefix}OutlineBrightness`, "Brightness", choices(["normal", "bright", "max"], true)),
            choice(`${prefix}OutlineGlow`, "Glow strength", choices([[1, "Soft"], [2, "Medium"], [3, "Strong"]], true)))) : null),
      bh(RN.View, { style: BUI.panel }, bh(BuilderExpand, { label: "Folder icons" },
        choice("folderCoverMode", "Closed folder cover", [{ value: "theme", label: "Theme / Auto" }, ...choices([["preview", "Server previews"], ["folder", "Folder icon"]])]),
        choice("folderColorSource", "Folder icon color source", SOURCE_CHOICES),
        values.folderColorSource === "toolkit" ? field("folderAccent", "Folder icon color") : null)));
  }
  function BuilderFolderPreview({ document }) {
    const model = builderPreviewModel(document);
    return bh(RN.View, { pointerEvents: "none", style: { ...BUI.panel, padding: 8, backgroundColor: model.sidebar, flexDirection: "row", justifyContent: "space-around" } }, ["closed", "open"].map(state =>
      bh(RN.View, { key: state, style: { alignItems: "center", gap: 6 } }, previewText(`folder-label-${state}`, state === "closed" ? "Closed" : "Open", model.secondary),
        bh(BuilderPreviewFolder, { document, state, model }))));
  }
  function BuilderMentionsEditor({ document, change }) {
    const v = document.values;
    const choice = (setting, label, options) => bh(BuilderAppearanceChoice, { key: setting, document, change, setting, label, options });
    const field = (setting, label) => bh(BuilderAppearanceColor, { key: setting, document, change, setting, label });
    return bh(RN.View, { style: BUI.panel },
      choice("mentionBackgroundSource", "Message background"), v.mentionBackgroundSource === "toolkit" ? field("mentionBackground", "Background color") : null,
      choice("mentionLineSource", "Side line"), v.mentionLineSource === "toolkit" ? field("mentionLine", "Line color") : null,
      choice("mentionTextMode", "Message text", choices([["theme", "Theme"], ["auto", "Auto contrast"], ["custom", "Custom"]])),
      v.mentionTextMode === "custom" ? field("mentionTextColor", "Message text color") : null,
      bh(RN.View, { style: BUI.rule }, choice("mentionTagSource", "Inline @mention tags"),
        v.mentionTagSource === "toolkit" ? bh(RN.View, { style: { gap: 12 } },
          choice("mentionTagMode", "Tag style", choices(["solid", "gradient"])),
          v.mentionTagMode === "solid" ? field("mentionTagColor", "Tag color") : [1,2,3].map(i => field(`mentionTagGradient${i}`, `Gradient color ${i}${i === 3 ? " (optional)" : ""}`))) : null));
  }
  function BuilderIconsEditor({ document, change, update }) {
    const [transfer, setTransfer] = React.useState("");
    const v = document.values;
    const choice = (setting, label, options) => bh(BuilderAppearanceChoice, { key: setting, document, change, setting, label, options });
    return bh(RN.View, { style: BUI.panel },
      bh(BuilderInterfaceIcons, { document, update }),
      bh(RN.View, { style: BUI.rule }),
      choice("iconSource", "Icon source"),
      v.iconSource === "toolkit" ? bh(RN.View, { style: { gap: 14 } },
        choice("iconPack", "Icon pack", choices([["outline", "Outline"], ["solid", "Solid"], ["custom", "Imported pack"]])),
        bh(BuilderExpand, { label: "Individual icons" }, ICON_SLOTS.map(slot => bh(BuilderIconOverride, { key: slot.key, slot, document, change }))),
        bh(BuilderExpand, { label: "Import / export icon pack" },
          bh(BuilderButton, { label: "Paste icon pack", onPress: async () => setTransfer(await readFromClipboard() ?? "") }),
          bh(RN.TextInput, { accessibilityLabel: "Icon pack text", multiline: true, value: transfer, onChangeText: setTransfer, maxLength: ICON_PACK_TEXT_LIMIT, style: { ...BUI.input, height: 140, textAlignVertical: "top" }, autoCapitalize: "none", autoCorrect: false }),
          bh(BuilderButton, { label: "Use icon pack", onPress: () => { try {
            const pack = parseIconPack(transfer);
            change("iconCustomPack", JSON.stringify(pack)); change("iconPack", "custom");
            for (const slot of ICON_SLOTS) { change(`${slot.key}IconMode`, "pack"); change(`${slot.key}IconImage`, ""); }
            toast(`Imported ${pack.name}`);
          } catch (error) { toast(error.message); } } }),
          bh(BuilderButton, { label: "Export icon pack", onPress: () => { try { const text = exportDocumentIconPack(document.values); setTransfer(text); toast(copyToClipboard(text) ? "Copied icon pack" : "Icon pack is in the box above"); } catch (error) { toast(error.message); } } }))) : null);
  }
  function BuilderIconOverride({ slot, document, change }) {
    const modeKey = `${slot.key}IconMode`, imageKey = `${slot.key}IconImage`;
    const image = storedIconImage(document.values[imageKey]);
    const raw = String(document.values[imageKey] ?? "");
    const uri = image?.uri ?? (raw.startsWith("{") ? (() => { try { return JSON.parse(raw).uri ?? ""; } catch { return raw; } })() : raw);
    const tint = image?.tint ?? false;
    return bh(RN.View, { style: BUI.rule },
      bh(BuilderAppearanceChoice, { document, change, setting: modeKey, label: slot.label, options: choices([["pack", "Icon pack"], ["custom", "Custom image"], ["discord", "Discord"]]) }),
      document.values[modeKey] === "custom" ? bh(RN.View, { style: { gap: 10 } },
        bh(RN.TextInput, { accessibilityLabel: `${slot.label} image`, placeholder: "HTTPS image URL or small PNG data URI", placeholderTextColor: "#85858F", value: uri, maxLength: 4096, autoCapitalize: "none", autoCorrect: false, style: BUI.input, onChangeText: value => change(imageKey, value ? JSON.stringify({ uri: value, tint }) : "") }),
        bh(BuilderChoice, { label: `Tint ${slot.label.toLowerCase()}`, value: tint, options: choices([[false, "Original colors"], [true, "Use accent color"]]), onChange: value => change(imageKey, uri ? JSON.stringify({ uri, tint: value }) : "") })) : null);
  }
  function exportDocumentIconPack(values) {
    const base = values.iconPack === "custom" ? parseIconPack(values.iconCustomPack) : { preset: values.iconPack, icons: {} };
    const icons = { ...base.icons };
    for (const slot of ICON_SLOTS) {
      const mode = values[`${slot.key}IconMode`];
      if (mode === "discord") icons[slot.key] = null;
      if (mode === "custom") {
        const image = storedIconImage(values[`${slot.key}IconImage`]);
        if (!image) throw new Error(`Choose a valid ${slot.label.toLowerCase()} image first`);
        icons[slot.key] = image;
      }
    }
    return JSON.stringify({ format: "theme-toolkit-icon-pack", version: 1, name: base.name ?? "My icon pack", ...(base.preset ? { preset: base.preset } : {}), icons }, null, 2);
  }
  function groupValue(document, keys, rawKeys) {
    for (const key of keys.split(" ")) { const value = colorValue(document.data.semanticColors?.[key]); if (value) return value; }
    for (const key of (rawKeys ?? "").split(" ")) { const value = colorValue(document.data.rawColors?.[key]); if (value) return value; }
    return "";
  }
  function changeColorGroup(document, group, value) {
    const next = cloneThemeValue(document);
    for (const key of group[1].split(" ")) {
      if (value.trim()) next.data.semanticColors[key] = [value, value]; else delete next.data.semanticColors[key];
    }
    for (const key of (group[2] ?? "").split(" ").filter(Boolean)) {
      if (value.trim()) next.data.rawColors[key] = value; else delete next.data.rawColors[key];
    }
    return next;
  }
  function generalBordersEnabled(document) {
    return !GENERAL_BORDER_KEYS.every(key => {
      const colors = document.data.semanticColors?.[key];
      return Array.isArray(colors) && colors.length > 0 && colors.every(value => colorValue(value) && colorAlpha(value) === 0);
    });
  }
  function setGeneralBordersEnabled(document, enabled) {
    if (!!enabled === generalBordersEnabled(document)) return document;
    const next = cloneThemeValue(document);
    next.data.themeToolkit ??= {};
    if (!enabled) {
      next.data.themeToolkit.generalBorders = { restore: Object.fromEntries(GENERAL_BORDER_KEYS.map(key => [key, next.data.semanticColors[key] ?? null])) };
      for (const key of GENERAL_BORDER_KEYS) next.data.semanticColors[key] = ["#00000000", "#00000000"];
    } else {
      const restore = next.data.themeToolkit.generalBorders?.restore;
      for (const key of GENERAL_BORDER_KEYS) {
        if (plainObject(restore)) {
          const colors = restore[key];
          delete next.data.semanticColors[key];
          if (Array.isArray(colors) && colors.length > 0 && colors.length <= 4 && colors.every(value => value === false || colorValue(value))) next.data.semanticColors[key] = colors;
        } else next.data.semanticColors[key] = ["#FFFFFF", "#FFFFFF"];
      }
      delete next.data.themeToolkit.generalBorders;
    }
    return next;
  }
  function BuilderGeneralBorders({ document, update }) {
    const enabled = generalBordersEnabled(document);
    const colors = [...new Set(GENERAL_BORDER_KEYS.flatMap(key => (document.data.semanticColors?.[key] ?? []).map(colorValue).filter(Boolean)))];
    return bh(RN.View, { style: { gap: 10 } },
      bh(RN.View, { style: { ...BUI.row, justifyContent: "space-between" } },
        bh(RN.Text, { style: BUI.label }, "Borders and outlines"),
        bh(RN.Switch, { accessibilityLabel: "Borders and outlines", value: enabled, onValueChange: value => update(current => setGeneralBordersEnabled(current, value)) })),
      bh(RN.Text, { style: BUI.text }, "Panel edges, dividers, buttons and input outlines. Folder outlines have their own controls."),
      enabled ? bh(BuilderColor, { label: "Border color", value: colors.length === 1 ? colors[0] : "", help: colors.length > 1 ? "Your existing border colors stay until you choose one color for all." : undefined,
        onChange: value => update(current => changeColorGroup(current, GENERAL_BORDER_GROUP, value)) }) : null);
  }
  function backgroundDiagnostics(document) {
    const read = fn => { try { return fn(); } catch { return null; } };
    const selected = read(currentTheme);
    const tokenRef = read(() => findByProps("SemanticColor"));
    const resolver = read(() => tokenRef?.default?.meta ?? tokenRef?.default?.internal);
    const resolve = read(() => resolver?.resolveSemanticColor);
    const tokens = read(() => tokenRef?.default?.colors ?? vendetta.ui?.semanticColors);
    const theme = read(() => vendetta.metro.findByStoreName?.("ThemeStore")?.theme);
    const variants = value => Array.isArray(value) ? value.slice(0, 2).map(color => typeof color === "string" || color === false ? color : null) : null;
    const surfaces = [
      [0, "BACKGROUND_BASE_LOWER BACKGROUND_PRIMARY"], [1, "CHANNEL_BACKGROUND_DEFAULT"],
      [2, "PANEL_BG BACKGROUND_BASE_LOWEST"], [3, "CARD_BACKGROUND_DEFAULT BACKGROUND_SURFACE_HIGH"],
      [4, "CHAT_INPUT_BACKGROUND INPUT_BACKGROUND_DEFAULT MOBILE_CHATINPUT_BACKGROUND_DEFAULT MOBILE_CHATINPUT_BACKGROUND_ACTIVE"],
    ];
    return {
      version: BUILDER_VERSION,
      selected: !!selected,
      previewActive: selected?.id === PREVIEW_THEME_ID,
      runtimeTheme: typeof theme === "string" ? theme : null,
      scope: "Global theme color resolver; component theme contexts and visible layers are not inspected.",
      popup: { field: popupBackgroundColor({ data: document.data }), applied: popupBackgroundColor(selected), ...popupSurfaceStats },
      surfaces: Object.fromEntries(surfaces.map(([index, keys]) => {
        const group = BUILDER_COLORS.backgrounds[index];
        return [group[0], { field: groupValue(document, group[1], group[2]), tokens: Object.fromEntries(keys.split(" ").map(key => {
          const token = read(() => tokens?.[key]);
          let status = token == null ? "token-unavailable" : typeof resolve !== "function" ? "resolver-unavailable" : typeof theme !== "string" ? "theme-unavailable" : "resolved";
          let resolved = null;
          if (status === "resolved") {
            try {
              const value = resolve.call(resolver, theme, token);
              try { resolved = manifestColor(value); } catch { status = "unsupported-color"; }
            } catch { status = "resolver-error"; }
          }
          return [key, { draft: variants(document.data.semanticColors?.[key]), applied: variants(selected?.data?.semanticColors?.[key]), resolved, status }];
        })) }];
      })),
    };
  }
  function BuilderBackgroundDiagnostics({ document }) {
    const [report, setReport] = React.useState("");
    return bh(BuilderExpand, { label: "Background troubleshooting" },
      bh(RN.Text, { style: BUI.text }, "If a Discord background stays unchanged after Preview, copy this report for troubleshooting."),
      bh(BuilderButton, { label: "Copy background diagnostics", onPress: () => {
        const text = JSON.stringify(backgroundDiagnostics(document), null, 2);
        setReport(text);
        toast(copyToClipboard(text) ? "Background diagnostics copied" : "Select and copy the report below");
      } }),
      report ? bh(RN.TextInput, { accessibilityLabel: "Background diagnostics", value: report, editable: false, multiline: true, selectTextOnFocus: true, style: { ...BUI.input, height: 160, textAlignVertical: "top" } }) : null);
  }
  function BuilderNativeColors({ section, document, update, onPreview }) {
    const [advancedKind, setAdvancedKind] = React.useState("semanticColors");
    const [token, setToken] = React.useState("");
    const [tokenValue, setTokenValue] = React.useState("");
    const allKeys = Object.keys(document.data[advancedKind] ?? {}).sort();
    return bh(RN.View, { style: BUI.panel },
      section === "backgrounds" ? bh(RN.Text, { style: BUI.text }, "These colors style Discord. Toolkit's editor stays dark. Use the sample above or tap Preview to see your theme in Discord.") : null,
      (BUILDER_COLORS[section] ?? []).map((group, index) => {
        if (group === GENERAL_BORDER_GROUP) return bh(BuilderGeneralBorders, { key: group[0], document, update });
        const focus = () => { if (section === "backgrounds") onPreview?.(BACKGROUND_PREVIEW_VIEWS[index]); };
        return bh(BuilderColor, { key: group[0], label: group[0], help: BUILDER_COLOR_HELP[group[0]], value: groupValue(document, group[1], group[2]), onFocus: focus,
          onChange: value => { focus(); update(current => changeColorGroup(current, group, value)); } });
      }),
      section === "backgrounds" ? bh(BuilderColor, { label: "Popup menus", value: popupBackgroundColor({ data: document.data }) ?? "",
        help: "Message long-press actions and other popup sheets. Leave blank to follow App background.", onFocus: () => onPreview?.("menu"),
        onChange: value => { onPreview?.("menu"); update(current => changePopupBackground(current, value)); } }) : null,
      bh(BuilderExpand, { label: "Advanced color tokens" },
        bh(BuilderChoice, { label: "Color type", value: advancedKind, options: choices([["semanticColors", "UI colors"], ["rawColors", "Raw colors"]]), onChange: value => { setAdvancedKind(value); setToken(""); setTokenValue(""); } }),
        allKeys.length ? bh(BuilderChoice, { label: "Existing color", value: token, options: choices(allKeys.map(key => [key, key])), onChange: key => { setToken(key); setTokenValue(colorValue(document.data[advancedKind][key]) ?? ""); } }) : null,
        bh(RN.TextInput, { accessibilityLabel: "Color token name", value: token, onChangeText: setToken, maxLength: 100, placeholder: "BACKGROUND_PRIMARY", placeholderTextColor: "#85858F", autoCapitalize: "characters", autoCorrect: false, style: BUI.input }),
        bh(BuilderColor, { label: "Token color", value: tokenValue, onChange: setTokenValue }),
        bh(BuilderButton, { label: "Set color token", onPress: () => {
          if (!/^[A-Z][A-Z0-9_]{0,100}$/.test(token) || tokenValue && !colorValue(tokenValue)) { toast("Enter a valid color token and hex color"); return; }
          update(current => { const next = cloneThemeValue(current); if (!tokenValue) delete next.data[advancedKind][token]; else next.data[advancedKind][token] = advancedKind === "semanticColors" ? [colorValue(tokenValue), colorValue(tokenValue)] : colorValue(tokenValue); return next; });
        } })),
      section === "backgrounds" ? bh(BuilderBackgroundDiagnostics, { document }) : null);
  }
  function BuilderAccentsEditor({ document, change, update }) {
    return bh(RN.View, { style: { gap: 14 } },
      bh(RN.View, { style: BUI.panel }, bh(RN.Text, { style: BUI.label }, "UI accents"),
        bh(BuilderAppearanceChoice, { document, change, setting: "uiAccentSource", label: "Accent source" }),
        document.values.uiAccentSource === "toolkit" ? [
          ["smartAccentColor", "Smart accent fallback"], ["selectedGuildAccent", "Selected + unread server indicators"], ["reactionAccent", "Reacted reaction"],
        ].map(([setting, label]) => bh(BuilderAppearanceColor, { key: setting, document, change, setting, label })) : null),
      bh(RN.View, { style: BUI.panel }, bh(BuilderExpand, { label: "Buttons, borders & status colors" }, bh(BuilderNativeColors, { section: "accents", document, update }))));
  }
  function ThemeBuilderSettings() {
    useBuilderUpdates();
    const [screen, setScreen] = React.useState("home");
    const [section, setSection] = React.useState("");
    const [folderState, setFolderState] = React.useState("closed");
    const [previewView, setPreviewView] = React.useState("chat");
    const [draft, setDraft] = React.useState(() => pluginStorage.toolkitThemeDraft?.document ?? null);
    const [original, setOriginal] = React.useState(() => pluginStorage.toolkitThemeDraft?.original ?? null);
    const [transfer, setTransfer] = React.useState("");
    const [exportId, setExportId] = React.useState(null);
    const [copyName, setCopyName] = React.useState("");
    const [error, setError] = React.useState("");
    const [menuId, setMenuId] = React.useState(null);
    const draftRef = React.useRef(draft);
    const originalRef = React.useRef(original);
    draftRef.current = draft; originalRef.current = original;
    React.useEffect(() => { void (async () => { try { await builderStartup; await initializeThemeLibrary(); } catch (error) { setError(error.message); } })(); }, []);
    const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(original);
    const run = async (action, success) => {
      if (builderBusy) return;
      builderBusy = true; notifyBuilder(); setError("");
      try { const result = await action(); if (success) success(result); }
      catch (error) { if (!fileCancelled(error)) setError(error?.message ?? "The operation could not be completed"); }
      finally { builderBusy = false; notifyBuilder(); }
    };
    const update = fn => {
      const next = typeof fn === "function" ? fn(draftRef.current) : fn;
      draftRef.current = next; setDraft(next);
      pluginStorage.toolkitThemeDraft = { document: next, original: originalRef.current, updatedAt: Date.now() };
    };
    const change = (key, value) => update(current => ({ ...current, values: { ...current.values, [key]: value } }));
    const openDraft = document => {
      const open = () => {
        const next = cloneThemeValue(document); draftRef.current = next; originalRef.current = cloneThemeValue(next);
        setDraft(next); setOriginal(originalRef.current); pluginStorage.toolkitThemeDraft = { document: next, original: originalRef.current, updatedAt: Date.now() };
        setSection(""); setScreen("editor"); setMenuId(null); setError("");
      };
      if (dirty) RN.Alert.alert("Keep your draft?", "You have unsaved changes.", [{ text: "Keep editing", style: "cancel", onPress: () => setScreen("editor") }, { text: "Discard draft", style: "destructive", onPress: () => void run(async () => { await stopThemePreview(); open(); }) }]);
      else open();
    };
    const goHome = () => { setScreen("home"); setSection(""); setError(""); };
    const save = asNew => void run(async () => {
      const document = { ...draftRef.current, name: asNew ? copyName : draftRef.current.name };
      return saveThemeDocument(document, asNew);
    }, saved => { draftRef.current = null; setDraft(null); setOriginal(null); toast(`Saved ${saved.name}`); goHome(); });
    const discard = () => RN.Alert.alert("Discard changes?", "Your saved theme will be kept.", [
      { text: "Keep editing", style: "cancel" }, { text: "Discard", style: "destructive", onPress: () => void run(async () => { await stopThemePreview(); delete pluginStorage.toolkitThemeDraft; }, () => { setDraft(null); setOriginal(null); goHome(); }) },
    ]);
    const actions = (items) => bh(RN.View, { style: BUI.row }, items.map((item, index) => bh(BuilderButton, { key: item.label ?? index, disabled: builderBusy, ...item })));
    const heading = (label, back) => bh(RN.View, { style: { ...BUI.row, flexWrap: "nowrap" } }, back ? bh(BuilderButton, { label: "‹ Back", compact: true, onPress: back }) : null, bh(RN.Text, { style: BUI.heading }, label));
    const previewActive = !!pluginStorage.toolkitPreviewRecovery && currentTheme()?.id === PREVIEW_THEME_ID;
    const activeId = activeDocumentId();
    let content;
    if (screen === "home") content = bh(RN.View, { style: { gap: 14 } },
      heading("My themes"), actions([
        { label: "＋ New theme", primary: true, onPress: () => openDraft(makeThemeDocument({ spec: 2, name: "Untitled theme", semanticColors: {}, rawColors: {} }, APPEARANCE_DEFAULTS)) },
        { label: "Import", onPress: () => { setTransfer(""); setScreen("import"); } },
      ]),
      draft ? bh(RN.View, { style: BUI.panel }, bh(RN.Text, { style: BUI.label }, `${dirty ? "Unsaved draft" : "Continue editing"}: ${draft.name}`), actions([{ label: "Resume", onPress: () => { setSection(""); setScreen("editor"); } }, { label: "Discard", onPress: discard }])) : null,
      savedThemes().map(document => bh(RN.View, { key: document.id, style: BUI.panel },
        bh(RN.View, { style: { ...BUI.row, flexWrap: "nowrap" } }, bh(RN.View, { style: { flex: 1, gap: 4 } }, bh(RN.Text, { style: BUI.label }, document.name), activeId === document.id ? bh(RN.Text, { style: BUI.text }, "✓ Active") : null), bh(BuilderButton, { label: "⋯", compact: true, onPress: () => setMenuId(menuId === document.id ? null : document.id) })),
        bh(RN.View, { style: BUI.row }, ["BACKGROUND_PRIMARY", "BACKGROUND_SECONDARY", "TEXT_LINK", "TEXT_NORMAL"].map((key, index) => bh(RN.View, { key, style: { width: 28, height: 18, borderRadius: 5, borderWidth: 1, borderColor: "#666670", backgroundColor: colorValue(document.data.semanticColors?.[key]) ?? ["#313338", "#1E1F22", "#8791FF", "#DBDEE1"][index] } }))),
        actions([{ label: activeId === document.id ? "Applied" : "Apply", disabled: builderBusy || activeId === document.id, onPress: () => void run(() => applyThemeDocument(document), () => toast(`Applied ${document.name}`)) }, { label: "Edit", onPress: () => openDraft(document) }]),
        menuId === document.id ? bh(RN.View, { style: BUI.rule }, actions([
          { label: "Duplicate", onPress: () => void run(() => saveThemeDocument({ ...document, name: `${document.name} copy` }, true, false), () => setMenuId(null)) },
          { label: "Export", onPress: () => { setExportId(document.id); setScreen("export"); } },
          { label: "Delete", danger: true, onPress: () => RN.Alert.alert("Delete theme?", `Delete ${document.name}?${activeId === document.id ? " Discord defaults will become active." : ""}`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void run(() => deleteThemeDocument(document)) }]) },
        ])) : null)),
      bh(BuilderExpand, { label: "Backup & troubleshooting" },
        bh(RN.Text, { style: BUI.text }, "Older profiles contained Toolkit settings only. Their theme copies use the base colors active when you upgraded."),
        actions([
          { label: "Export all themes", onPress: () => void run(() => exportThemeTextFile(themeLibraryBackup(), "theme-toolkit-backup.json"), () => toast("Theme backup saved")) },
          { label: "Copy all themes", onPress: () => void run(() => themeLibraryBackup(), backup => { setTransfer(backup); copyToClipboard(backup); setScreen("backup"); }) },
          { label: "Copy legacy profile backup", onPress: () => { const backup = createProfileBackup(storedProfiles()); setTransfer(backup); copyToClipboard(backup); setScreen("backup"); } },
          { label: "Copy folder diagnostics", onPress: () => toast(copyToClipboard(folderDiagnostics()) ? "Copied diagnostics" : "Clipboard unavailable") },
          { label: "Copy icon diagnostics", onPress: () => toast(copyToClipboard(iconDiagnostics()) ? "Copied diagnostics" : "Clipboard unavailable") },
          { label: "Retry icon images", onPress: () => { retryIconImages(); refreshToolkitUI(); toast("Retrying icon images"); } },
          { label: "Reset Discord folder colors", danger: true, onPress: () => RN.Alert.alert("Reset Discord folder colors?", "This clears every folder’s saved Discord color.", [{ text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: () => void run(resetAllDiscordFolderColors) }]) },
          { label: "Reload Discord", onPress: () => { if (!scheduleDiscordReload()) toast("Close and reopen Discord to reload"); } },
        ])));
    if (screen === "editor" && draft) content = bh(RN.View, { style: { gap: 14 } },
      !section ? heading("Edit theme", goHome) : null,
      !section ? bh(RN.View, { style: { gap: 14 } },
        bh(RN.Text, { style: BUI.label }, "Theme name"), bh(RN.TextInput, { accessibilityLabel: "Theme name", value: draft.name, onChangeText: name => update(current => ({ ...current, name })), maxLength: 64, style: BUI.input }),
        bh(RN.Text, { style: BUI.text }, dirty ? "Unsaved changes" : themeDocument(draft.id) ? "Saved theme" : "New theme"),
        bh(BuilderDraftPreview, { document: draft, view: previewView, onViewChange: setPreviewView }),
        bh(RN.View, { style: BUI.panel }, [["backgrounds", "Background colors"], ["text", "Text"], ["accents", "Accents"], ["icons", "Icons"], ["fonts", "Fonts"], ["avatars", "Avatars & usernames"], ["folders", "Folders"], ["mentions", "Mentions"]].map(([key, label]) => bh(BuilderButton, { key, label: `${label} ›`, onPress: () => setSection(key) }))),
        bh(BuilderExpand, { label: "Theme details" },
          bh(RN.TextInput, { accessibilityLabel: "Description", placeholder: "Description", placeholderTextColor: "#85858F", value: draft.data.description ?? "", onChangeText: description => update(current => ({ ...current, data: { ...current.data, description } })), maxLength: 300, style: BUI.input }),
          bh(RN.TextInput, { accessibilityLabel: "Author", placeholder: "Your name", placeholderTextColor: "#85858F", value: draft.data.authors?.[0]?.name ?? "", onChangeText: name => update(current => ({ ...current, data: { ...current.data, authors: name ? [{ name }] : [] } })), maxLength: 64, style: BUI.input }))) : null,
      ["backgrounds", "text"].includes(section) ? bh(BuilderNativeColors, { section, document: draft, update, onPreview: setPreviewView }) : null,
      section === "accents" ? bh(BuilderAccentsEditor, { document: draft, change, update }) : null,
      section === "icons" ? bh(BuilderIconsEditor, { document: draft, change, update }) : null,
      section === "fonts" ? bh(BuilderFontEditor, { document: draft, update }) : null,
      section === "avatars" ? bh(BuilderAvatarsEditor, { document: draft, update }) : null,
      section === "folders" ? bh(BuilderFolderEditor, { document: draft, change, state: folderState, setState: setFolderState }) : null,
      section === "mentions" ? bh(BuilderMentionsEditor, { document: draft, change }) : null,
      bh(RN.View, { style: BUI.rule }, actions([{ label: "Preview", onPress: () => void run(() => previewThemeDocument(draftRef.current), () => toast("Preview active. Return to Discord to see it; reopen Toolkit to save or stop preview.")) }, { label: "Save", primary: true, onPress: () => save(false) }]),
        actions([{ label: "Save as new theme", onPress: () => { setCopyName(draft.name + " copy"); setScreen("saveas"); } }, { label: "Discard changes", onPress: discard }])));
    if (screen === "saveas") content = bh(RN.View, { style: { gap: 14 } }, heading("Save as new", () => setScreen("editor")), bh(RN.TextInput, { accessibilityLabel: "New theme name", value: copyName, onChangeText: setCopyName, maxLength: 64, style: BUI.input }), actions([{ label: "Save new theme", primary: true, onPress: () => save(true) }]));
    if (screen === "export") {
      const document = themeDocument(exportId);
      content = bh(RN.View, { style: { gap: 14 } }, heading("Export theme", goHome), bh(RN.Text, { style: BUI.label }, document?.name),
        actions([{ label: "Add to Revenge Themes", primary: true, onPress: () => void run(() => registerNativeTheme(document), () => toast("Added to Revenge Themes")) },
          { label: "Export theme file", onPress: () => void run(() => exportThemeFile(document), () => toast("Theme file saved")) },
          { label: "Copy theme text", onPress: () => { try { const text = documentExport(document); setTransfer(text); copyToClipboard(text); setScreen("backup"); } catch (error) { setError(error.message); } } }]),
        bh(RN.Text, { style: BUI.text }, "The file includes colors, Toolkit effects, avatar settings and the linked Revenge font name. Recipients need Toolkit enabled; linked fonts must already be installed in Revenge."));
    }
    if (screen === "import") content = bh(RN.View, { style: { gap: 14 } }, heading("Import theme", goHome),
      actions([{ label: "Choose theme file", primary: true, onPress: () => void run(async () => { const text = await readThemeFile(); if (text) setTransfer(text); }) }, { label: "Paste theme text", onPress: async () => setTransfer(await readFromClipboard() ?? "") }]),
      actions([{ label: "Copy current appearance", onPress: () => { try { openDraft(makeThemeDocument(currentTheme()?.data ?? { spec: 2, name: "Discord default" }, appearanceSnapshot(), { name: (currentTheme()?.data?.name ?? "Discord default") + " copy" })); } catch (error) { setError(error.message); } } }]),
      bh(RN.TextInput, { accessibilityLabel: "Theme import text", value: transfer, onChangeText: setTransfer, maxLength: THEME_TEXT_LIMIT, multiline: true, autoCorrect: false, autoCapitalize: "none", placeholder: "Theme JSON or a Toolkit profile backup", placeholderTextColor: "#85858F", style: { ...BUI.input, height: 160, textAlignVertical: "top" } }),
      actions([{ label: "Import", onPress: () => void run(() => importThemes(transfer), imported => { toast(`Imported ${imported.length} theme${imported.length === 1 ? "" : "s"}`); setTransfer(""); goHome(); }) }]));
    if (screen === "backup") content = bh(RN.View, { style: { gap: 14 } }, heading("Theme text", goHome),
      bh(RN.TextInput, { accessibilityLabel: "Exported theme text", value: transfer, editable: false, multiline: true, selectTextOnFocus: true, style: { ...BUI.input, height: 180, textAlignVertical: "top" } }), actions([{ label: "Copy", onPress: () => toast(copyToClipboard(transfer) ? "Copied" : "Select and copy the text above") }]));
    const sectionPreview = screen === "editor" && draft && section ? bh(RN.View, { testID: "tt-sticky-preview", style: { backgroundColor: BUI.page.backgroundColor, gap: 8, paddingBottom: 8 } },
      heading(({ backgrounds: "Background colors", text: "Text", accents: "Accents", icons: "Icons", fonts: "Fonts", avatars: "Avatars & usernames", folders: "Folders", mentions: "Mentions" })[section], () => setSection("")),
      bh(BuilderDraftPreview, { document: draft, section, view: previewView, onViewChange: setPreviewView })) : null;
    return bh(RN.ScrollView, { key: `${screen}:${section}`, keyboardShouldPersistTaps: "handled", contentContainerStyle: BUI.page, stickyHeaderIndices: sectionPreview ? [0] : undefined },
      ...(sectionPreview ? [sectionPreview] : []),
      bh(RN.Text, { style: BUI.text }, `Theme Toolkit v${BUILDER_VERSION}`),
      toolkitUpdateIncomplete ? bh(RN.Text, { accessibilityRole: "alert", style: { ...BUI.text, color: "#FFCA80" } }, "The update is incomplete. Refetch Theme Toolkit again, then close and reopen Discord. Your saved themes do not need to be cleared.") : null,
      previewActive ? bh(RN.View, { style: BUI.panel }, bh(RN.Text, { style: BUI.label }, "Preview active"), bh(BuilderButton, { label: "Stop preview", disabled: builderBusy, onPress: () => void run(stopThemePreview) })) : null,
      error ? bh(RN.Text, { accessibilityRole: "alert", style: { ...BUI.text, color: "#FF999F" } }, error) : null,
      builderBusy ? bh(RN.Text, { accessibilityLiveRegion: "polite", style: BUI.text }, "Working…") : null, content);
  }
  // END THEME BUILDER

  return {
    onLoad() {
      folderVisualsActive = true;
      installAppStateListener();
      unpatchFolderJSX = patchFolderJSX();
      unpatchFolder = patchFolderRenderer();
      unpatchFolderBG = patchExpandedFolderBackground();
      unpatchChannelUnread = patchChannelUnreadIndicators();
      unpatchChannelUnreadDirect = patchDirectChannelUnreadIndicator();
      unpatchMessageRowManager = patchMessageRowManager();
      unpatchMentions = patchMentionHighlights();
      unpatchMentionTags = patchMentionTags();
      unpatchGuildBarStyles = patchGuildBarAccent();
      unpatchGuildBarDirect = patchGuildBarDirectRenderer();
      unpatchGuildIndicator = patchSelectedGuildIndicator();
      unpatchHomeIcon = patchGeneratedIcon(HomeIconModule, "HomeIcon", "homeIcon");
      unpatchChatIcon = patchGeneratedIcon(ChatIconModule, "ChatIcon", "homeIcon");
      unpatchSearchIcon = patchGeneratedIcon(SearchIconModule, "MagnifyingGlassIcon", "searchIcon");
      unpatchChannelSearchIcon = patchGeneratedIcon(ChannelSearchIconModule, "ChannelListMagnifyingGlassIcon", "searchIcon");
      unpatchBellIcon = patchGeneratedIcon(BellIconModule, "BellIcon", "notificationIcon");
      unpatchBellSlashIcon = patchGeneratedIcon(BellSlashIconModule, "BellSlashIcon", "notificationIcon");
      unpatchBellZIcon = patchGeneratedIcon(BellZIconModule, "BellZIcon", "notificationIcon");
      unpatchChannelNotificationIcon = patchGeneratedIcon(ChannelNotificationIconModule, "ChannelNotificationIcon", "notificationIcon");
      unpatchChatNotificationIcon = patchGeneratedIcon(ChatNotificationIconModule, "ChatNotificationIcon", "notificationIcon");
      unpatchSettingsIcon = patchGeneratedIcon(SettingsIconModule, "SettingsIcon", "settingsIcon");
      unpatchBaseIconImage = patchBaseIconImageRenderer();
      unpatchLegacyIconRender = patchLegacyIconRenderer();
      unpatchNativeImageRender = patchNativeImageRenderer();
      unpatchSearchButtonDirect = patchSearchButtonRenderer();
      unpatchDesignIconButton = patchDesignIconButtons();
      unpatchGuildSearchContainer = patchGuildSearchContainerRenderer();
      unpatchIconActionButton = patchIconActionButtons();
      unpatchLegacyHeaderIcon = patchLegacyHeaderIcons();
      unpatchHeaderIconButton = patchHeaderIconButtons();
      unpatchGuildWrapperOverlay = patchGuildWrapperSelectedOverlay();
      iconReplacementsActive = true;
      iconReplacementPatches = patchIconReplacements();
      startThemeTracking();
      startThemeBuilder();
      refreshFolderUI();
    },
    onUnload() {
      stopThemeBuilder();
      stopThemeTracking();
      iconReplacementsActive = false;
      folderVisualsActive = false;
      notifyVisuals();
      for (const unpatch of iconReplacementPatches.reverse()) { try { unpatch(); } catch {} }
      iconReplacementPatches = [];
      failedIconImages.clear();
      try { unpatchFolder?.(); } catch {}
      try { unpatchFolderJSX?.(); } catch {}
      try { unpatchFolderBG?.(); } catch {}
      try { unpatchChannelUnread?.(); } catch {}
      try { unpatchChannelUnreadDirect?.(); } catch {}
      try { unpatchMessageRowManager?.(); } catch {}
      try { unpatchMentions?.(); } catch {}
      try { unpatchMentionTags?.(); } catch {}
      try { unpatchGuildBarStyles?.(); } catch {}
      try { unpatchGuildBarDirect?.(); } catch {}
      try { unpatchGuildIndicator?.(); } catch {}
      try { unpatchHomeIcon?.(); } catch {}
      try { unpatchChatIcon?.(); } catch {}
      try { unpatchSearchIcon?.(); } catch {}
      try { unpatchChannelSearchIcon?.(); } catch {}
      try { unpatchBellIcon?.(); } catch {}
      try { unpatchBellSlashIcon?.(); } catch {}
      try { unpatchBellZIcon?.(); } catch {}
      try { unpatchChannelNotificationIcon?.(); } catch {}
      try { unpatchChatNotificationIcon?.(); } catch {}
      try { unpatchSettingsIcon?.(); } catch {}
      try { unpatchBaseIconImage?.(); } catch {}
      try { unpatchLegacyIconRender?.(); } catch {}
      try { unpatchNativeImageRender?.(); } catch {}
      try { unpatchSearchButtonDirect?.(); } catch {}
      try { unpatchDesignIconButton?.(); } catch {}
      try { unpatchGuildSearchContainer?.(); } catch {}
      try { unpatchIconActionButton?.(); } catch {}
      try { unpatchLegacyHeaderIcon?.(); } catch {}
      try { unpatchHeaderIconButton?.(); } catch {}
      try { unpatchGuildWrapperOverlay?.(); } catch {}
      unpatchFolder = null;
      unpatchFolderJSX = null;
      unpatchFolderBG = null;
      unpatchChannelUnread = null;
      unpatchChannelUnreadDirect = null;
      unpatchMessageRowManager = null;
      unpatchMentions = null;
      unpatchMentionTags = null;
      unpatchGuildBarStyles = null;
      unpatchGuildBarDirect = null;
      unpatchGuildIndicator = null;
      unpatchHomeIcon = null;
      unpatchChatIcon = null;
      unpatchSearchIcon = null;
      unpatchChannelSearchIcon = null;
      unpatchBellIcon = null;
      unpatchBellSlashIcon = null;
      unpatchBellZIcon = null;
      unpatchChannelNotificationIcon = null;
      unpatchChatNotificationIcon = null;
      unpatchSettingsIcon = null;
      unpatchBaseIconImage = null;
      unpatchLegacyIconRender = null;
      unpatchNativeImageRender = null;
      unpatchSearchButtonDirect = null;
      unpatchDesignIconButton = null;
      unpatchGuildSearchContainer = null;
      unpatchIconActionButton = null;
      unpatchLegacyHeaderIcon = null;
      unpatchHeaderIconButton = null;
      unpatchGuildWrapperOverlay = null;
      removeAppStateListener();
      visualSubscribers.clear();
      colorSubscribers.clear();
      stopColorTimer();
      if (messageRowRefreshTimer != null) clearTimeout(messageRowRefreshTimer);
      messageRowRefreshTimer = null;
      stopSharedMotionClocks();
      pathGeometryCache.clear();
      messageRowRefreshers.clear();
      messageRowAppliedRevisions.clear();
      // WeakMap entries disappear with Discord's component functions after unload.
    },
    settings: ThemeBuilderSettings,
  };
})();
