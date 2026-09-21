# Changelog

## 0.3.3

- Use one steady 2.4-second pulse cycle for the moving-state indicator.
- Avoid rebuilding the card for unrelated Home Assistant updates, preventing animation restarts and quick flashes.
- Correct the placement of the deeper state-color styling introduced in 0.3.2.

## 0.3.2

- Deepen the state-color wash along the side of each garage-door tile.
- Increase the state tint and border strength on the garage-door control button.
- Keep the existing Open, Closed, and moving text colors unchanged.

## 0.3.1

- Make the card-title and per-door display-name fields self-contained so they render reliably in every Home Assistant editor context.
- Preserve one Display name field for every configured garage door.

## 0.3.0

- Replace the single global display-name option with a repeatable visual editor for garage doors.
- Put an individual Display name field directly beneath every garage-door entity picker.
- Keep existing `{ entity, name }` YAML configurations compatible.
- Increase the garage-door control icon slightly for a larger tap target.

## 0.2.2

- Add a garage-door display-name field to the visual editor.
- Support `name` in YAML for overriding a single door's long entity name.

## 0.2.1

- Require confirmation for every garage-door activation, including Stop.
- Use neutral "Activate garage door?" wording with No and Yes buttons for all states.

## 0.2.0

- Replace the separate Open, Stop, and Close buttons with the garage-door icon as a single state-aware control.
- Keep confirmation for Open and Close commands; Stop remains immediate.
- Prevent live Home Assistant updates from swallowing pointer clicks.
- Remove a redundant confirmation-dialog open call.

## 0.1.0

- Initial release.
- Add multi-door control with live state styling.
- Add Open, Stop, and Close actions with optional confirmation.
- Add visual editor and HACS metadata.
