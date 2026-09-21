# Changelog

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
