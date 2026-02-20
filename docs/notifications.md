# Notifications

## Overview

This module provides gentle reminders for school-related preparation and homework.

Channels:

- in-app notifications (available now)
- push subscriptions (stored now, dispatch plumbing prepared)

## Data Model

- `notification_rules`
  - parent-defined rules per child and reminder type
  - fields: `type`, `channel`, `time_of_day`, `enabled`
- `in_app_notifications`
  - generated reminders visible in child/parent UI
  - supports read state (`is_read`)
- `push_subscriptions`
  - browser subscription metadata (`endpoint`, keys, user agent)

## Behaviour

### Parent

- `/parent/notifications`
  - edit rule channel/time/enable state
  - activate push on current device
  - trigger manual test reminder generation

### Child

- sees in-app reminders in `/child/checklists`
- unread count can appear in child tab bar
- can mark reminders as read

## Reminder Generation

Current implementation supports manual trigger:

- action checks enabled rules
- inspects tomorrow diary entries/checklists
- creates matching in-app notifications

This is designed to be upgraded to scheduled jobs later.

## Push Notes

Push subscription capture requires:

- browser support for Service Worker + PushManager
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in environment

Production push dispatch still requires private key + scheduled sender.

## Limitations

- no per-device notification center yet
- no delivery tracking/receipt analytics
- no quiet-hours policy in this phase

## Future Work

- scheduled reminder jobs (cron)
- full web push delivery pipeline
- richer preferences (weekday presets, quiet windows).
