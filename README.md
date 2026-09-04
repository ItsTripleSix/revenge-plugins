# revenge-plugins

Custom Revenge Classic plugins focused on privacy, quality-of-life, and restoring useful Discord features.

## Plugins

### Silent Typing

Adds an Aliucord-style silent-typing toggle directly to Discord's mobile message composer.

- **Visible / normal typing:** plain keyboard icon.
- **Invisible / silent typing:** same keyboard icon with a configurable slash over it.
- Tapping the icon shows a confirmation popup telling you whether typing is now Visible or Invisible.
- Keyboard and slash colors are independently configurable.
- Both colors support independent alpha/transparency values.
- Color swatches open Discord's native color picker when available.
- Live settings preview shows both Visible and Invisible states.
- Composer button, slash indicator, confirmation popup, and button side are configurable.
- Silent mode blocks Discord's outgoing typing event; normal mode restores Discord's original typing behavior.
- Settings and silent state persist between restarts.

Install in **Discord Settings → Revenge → Plugins → +**:

```text
https://raw.githubusercontent.com/ItsTripleSix/revenge-plugins/main/plugins/silent-typing/
```

Open the plugin's settings page in Revenge to customize its appearance and behavior.

## Compatibility

These plugins target Revenge Classic's Vendetta-compatible plugin loader. Discord updates can change internal modules and occasionally require plugin fixes.

## License

MIT
