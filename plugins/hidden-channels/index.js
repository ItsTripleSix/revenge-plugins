(() => {
  "use strict";

  const { React, ReactNative: RN } = vendetta.metro.common;

  function Settings() {
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
          },
        },
        "This build is temporarily disabled after a gateway compatibility issue caused Discord to crash. It currently makes no runtime changes.",
      ),
    );
  }

  return {
    onLoad() {},
    onUnload() {},
    settings: Settings,
  };
})();