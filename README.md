# BradensHeadGenerator

Minecraft skin renderer for generating 3D head and full-body renders.

Supports multiple skin providers, including [Mineskin](https://mineskin.eu), [Minotar](https://minotar.net), and [BradensSkinProxy](https://github.com/BradenM64/BradensSkinProxy) (self-hosted option).

## Configuration

Frontend settings are stored in:

```text
config.json
```

The configuration contains the skin provider settings, control ranges, and default rendering settings.

## Skin Providers

### Minotar & Mineskin
Uses [Minotar](https://minotar.net) or [Mineskin](https://mineskin.eu) to lookup Minecraft skins.

```json
{
  "skinProvider": "minotar",
}
```
or
```json
{
  "skinProvider": "mineskin",
}
```

There is no need to set `proxyUrl` if not using one of these options.

### Proxy
Uses [BradensSkinProxy](https://github.com/BradenM64/BradensSkinProxy) to look up Minecraft skins.

```json
{
  "skinProvider": "proxy",
  "proxyUrl": "http://localhost:3000"
}
```

When using this option, `proxyUrl` should point to your proxy instance.
