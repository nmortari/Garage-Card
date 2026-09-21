# Garage Door Control Card

A responsive Home Assistant dashboard card for one or more garage-door cover entities. Its visual design complements the [FWEC2 Thermostat Card](https://github.com/nmortari/FWEC2-Thermostat-Card).

## Features

- Live open, closed, opening, closing, unavailable, and unknown states
- A single state-aware garage icon: Open, Close, or Stop
- Confirmation before every activation, including Stop, by default
- Reliable first-tap handling during live Home Assistant state updates
- Custom card title and garage-door display name
- Optional last-changed time
- Multiple garage doors in one card
- Home Assistant visual editor
- HACS-compatible repository structure

## Install with HACS

1. Open HACS and choose **Dashboard**.
2. Open **Custom repositories**.
3. Add this repository URL with category **Dashboard**.
4. Install **Garage Door Control Card** and refresh Home Assistant.
5. Add the card from the dashboard editor or use YAML.

## Example for one door

```yaml
type: custom:garage-door-control-card
title: Home Garage
name: Small Garage
entities:
  - cover.small_garage_door
```

## Example for multiple doors

```yaml
type: custom:garage-door-control-card
title: Garage Doors
entities:
  - entity: cover.small_garage_door
    name: Small Garage
  - entity: cover.large_garage_door
    name: Large Garage
confirm_actions: true
show_last_changed: true
```

The visual editor accepts cover entities directly. Use YAML objects as shown above when you want a custom name for each door.

## Options

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `title` | No | `Garage Doors` | Card heading |
| `name` | No | Entity friendly name | Display name for a single garage door |
| `entities` | Yes | — | List of cover entity IDs or `{ entity, name }` objects |
| `confirm_actions` | No | `true` | Confirm every garage-door activation |
| `show_last_changed` | No | `true` | Show the relative last-changed time |

## ESPHome compatibility

The card uses standard Home Assistant cover services, so it works directly with an ESPHome template cover such as:

```yaml
cover:
  - platform: template
    name: Garage Door
    device_class: garage
```

No relay or contact-sensor entity needs to be exposed separately to the card.
