# Account Switcher

A minimal Revenge Classic plugin that restores Discord's built-in mobile multi-account switcher and exposes saved native accounts from the main Revenge settings section.

## Security model

This plugin deliberately does **not** implement its own credential vault.

- No `getToken()` calls.
- No `switchAccountToken()` calls.
- No password handling.
- No token storage or export.
- No clipboard access.
- No `fetch()` or other network requests.
- No remote code loading.
- Saved accounts remain owned and managed by Discord's native `MultiAccountStore`.
- Account switching uses Discord's native account-switch action by user ID.

If Discord removes or changes the required native modules, the plugin fails closed and reports that the native switcher is unavailable rather than falling back to credential handling.

## Install

In **Discord Settings → Revenge → Plugins → +**, paste:

```text
https://raw.githubusercontent.com/ItsTripleSix/revenge-plugins/main/plugins/account-switcher/
```

Once enabled, **Account Switcher** is added directly to the main Revenge settings section, alongside the other custom shortcuts such as Purge Tools.
