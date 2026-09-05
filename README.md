# revenge-plugins

Custom Revenge Classic plugins and themes focused on privacy, quality-of-life, and restoring useful Discord features.

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

### Hidden Channels

Shows server channels that Discord normally removes from the sidebar when your account lacks `VIEW_CHANNEL` permission.

- Disables Discord's private-channel metadata-obfuscation capability when the client connects.
- Shows the real channel name and preserves normal category/order when Discord still sends that metadata.
- Marks inaccessible channel rows as locked.
- Suppresses unread styling for inaccessible channels.
- Tapping a hidden channel opens a metadata summary instead of trying to load its messages.
- Metadata summary includes name, type, topic, creation date, overwrite count, and channel ID.
- Blocks message fetching and direct channel navigation for channels you cannot access.

Install in **Discord Settings → Revenge → Plugins → +**:

```text
https://raw.githubusercontent.com/ItsTripleSix/revenge-plugins/main/plugins/hidden-channels/
```

After first installing or updating Hidden Channels, force-close Discord and reopen it once so the next gateway connection is made without Discord's private-channel metadata-obfuscation capability. If Discord stops sending a channel's metadata server-side entirely, a client plugin cannot reconstruct it.

### Quick Mock

Fast alternating-case mock text inspired by Aliucord's MoreSlashCommands `/mock` command.

#### Ways to use it

1. **Long-press → Mock — fastest**
   - Long-press somebody's text message and tap **Mock**.
   - By default, the mocked text is placed in your composer so you can review it first.
   - Enable **Long-press sends immediately** in Quick Mock settings if you want it sent as soon as you tap Mock.

2. **Reply → `/mock`**
   - Reply to a text message.
   - Type `/mock` with no `message` argument and send it.
   - Quick Mock uses the message you replied to automatically.

3. **`/mock message:...`**
   - Use the slash command normally and enter any text in the `message` field.

Example:

```text
/mock message:I know everything
→ i KnOw eVeRyThInG
```

Quick Mock alternates capitalization across letters only, so spaces and punctuation do not change the pattern. If composer injection is unavailable, the long-press action falls back to copying the transformed text.

The plugin settings page includes a collapsible **How to use** section with these same instructions and examples.

Install in **Discord Settings → Revenge → Plugins → +**:

```text
https://raw.githubusercontent.com/ItsTripleSix/revenge-plugins/main/plugins/quick-mock/
```

### Folder Contrast

Optional companion for dark/AMOLED themes. Discord derives an uncolored folder's default accent from its global brand color, which can make folders nearly disappear on a monochrome theme.

- Gives only folders that still use Discord's **default** color a visible light-gray accent.
- Keeps the expanded folder background black.
- Does not change a folder after you manually choose a color in Discord's folder settings.
- Avoids changing Discord's global brand color, so unrelated buttons and controls are not recolored just to fix folders.

Install in **Discord Settings → Revenge → Plugins → +**:

```text
https://raw.githubusercontent.com/ItsTripleSix/revenge-plugins/main/plugins/folder-contrast/
```

## Themes

### AMOLED Monochrome

A maximum-black OLED theme built around pure black surfaces with white and gray UI accents.

- Uses `#000000` for the main Discord surfaces wherever the current theme system exposes them.
- White primary text and icons with gray secondary/muted text.
- White borders and separators at different opacity levels instead of colored accents.
- White brand/accent styling, including primary branded buttons with black text.
- White mentions and links to keep the overall interface monochrome.
- Hover/selected states use subtle translucent white instead of gray background panels where possible.
- Keeps red, green, yellow, and orange status colors for danger/success/warning states so important UI meaning is not lost.
- Uses the current Revenge/Vendetta **theme spec 2** format.
- For visible default server folders while preserving manually chosen Discord folder colors, install the optional **Folder Contrast** companion plugin above.

Install in **Discord Settings → Revenge → Themes → +** by pasting:

```text
https://raw.githubusercontent.com/ItsTripleSix/revenge-plugins/main/themes/amoled-monochrome.json
```

## Compatibility

These plugins and themes target Revenge Classic's Vendetta-compatible loader. Discord updates can change internal modules and color tokens and occasionally require fixes.

## License

MIT