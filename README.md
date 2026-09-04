# revenge-plugins

Custom Revenge Classic plugins focused on privacy, quality-of-life, and restoring useful Discord features.

## Plugins

### Silent Typing

Adds an Aliucord-style silent-typing toggle directly to Discord's mobile message composer.

- **Visible / normal typing:** plain keyboard icon using its own configurable color.
- **Invisible / silent typing:** keyboard uses a separate configurable active color.
- Optional independently colored slash appears over the keyboard while silent typing is enabled.
- Tapping the icon shows a confirmation popup telling you whether typing is now Visible or Invisible.
- Separate color controls for visible keyboard, silent keyboard, and slash.
- Each color supports independent alpha/transparency.
- Color swatches and buttons open Discord's native visual color picker.
- Live settings preview shows both Visible and Invisible states.
- Composer button is placed on the **left by default**, with an option to move it to the right.
- Composer button, slash indicator, confirmation popup, and placement are configurable.
- Silent mode blocks Discord's outgoing typing event; normal mode restores Discord's original typing behavior.
- Settings and silent state persist between restarts.

Install in **Discord Settings → Revenge → Plugins → +**:

```text
https://raw.githubusercontent.com/ItsTripleSix/revenge-plugins/main/plugins/silent-typing/
```

Open the plugin's settings page in Revenge to customize its appearance and behavior.

### Composer Cleaner

Separately controls Discord's native message-composer buttons without modifying Silent Typing or other third-party composer plugins.

Current controls:

- Attachment / media (`+`)
- Gift / Nitro
- Emoji / Expression picker
- Voice-message microphone
- Apps & Commands
- New Thread
- Quick **Hide all** / **Show all** controls

All buttons remain visible by default until you choose what to hide.

Install in **Discord Settings → Revenge → Plugins → +**:

```text
https://raw.githubusercontent.com/ItsTripleSix/revenge-plugins/main/plugins/composer-cleaner/
```

Composer Cleaner only removes controls that it can identify as Discord-native composer controls. Unknown third-party buttons are preserved so it can coexist with plugins such as Silent Typing.

## Compatibility

These plugins target Revenge Classic's Vendetta-compatible plugin loader. Discord updates can change internal modules and occasionally require plugin fixes.

## License

MIT
