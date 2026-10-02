---
title: Features
description: The five portals, the checks each one backs, and the workarounds they need.
---

Seven checks across five portals. This page is organised by portal, because the
portal is what determines the limits, the failure modes and the workaround, not
the check name.

## Gladius {#gladius}

Customer radius profile: signal level, loss, and the access node serving the line.

| | |
|---|---|
| Backs | `EMBASSY` |
| Sessions | 2 |
| Failure mode | Session expires and demands a captcha |

Gladius is the only portal that can stop mid-run and need a person. The bot
handles this with a single flight lock, so an expired session sends exactly one
captcha request to the debug group no matter how many jobs are waiting. Everyone
blocked on that session resumes together.

A captcha in the technician group means something went wrong with the routing.
It should never appear there.

## ProMan {#proman}

ODP lookup and ticket creation.

| | |
|---|---|
| Backs | `UMAS`, `CREATE TICKET` |
| Sessions | 1, strict |

ProMan is limited to one because it uses a single tab session and rejects a
second one rather than queueing it. `UMAS` runs here first to resolve an ODP into
the list of customers behind it, then hands off to IBooster.

Ticket creation has a 120 character limit on the CREATE_TICKET section, and it
retries at most three times before giving up. A longer message is rejected
rather than truncated, because a truncated ticket is worse than no ticket.

## IBooster {#ibooster}

ONU measurement and dead ONT detection.

| | |
|---|---|
| Backs | `UMAS`, `JAM MATI` |
| Sessions | 1 |

A measurement overwrites the previous reading, so two concurrent measurements
mean one of them is wrong. That is why this limit is one and not two.

The screenshot cropping logic for the result table is a locked standard. It is
commented as such in the source and should not be refactored.

## ACSIS {#acsis}

ONT serial number lookup.

| | |
|---|---|
| Backs | `ACS ONT` |
| Sessions | 1 |

A shared ACS pool with one session at a time. Requests here queue behind each
other more often than anywhere else, which is why the dashboard shows a separate
semaphore meter for it.

## Finpay {#finpay}

Billing: payment status and first up payment.

| | |
|---|---|
| Backs | `CEK PAYMENT`, `CEK FUP` |
| Sessions | 2 |

Read only, so two sessions are safe. The request still needs both a word like
`cek` or `tolong` and a billing word such as `tagihan`, `payment`, `bayar` or
`lunas`. One of the two alone is not enough, because "cek ODP" would otherwise be
ambiguous with the radius checks.

## Web Cek {#web-cek}

Every check is also reachable from the browser, without sending anything to
Telegram. This is the useful path when you are already at a desk and want the
screenshot to land in your clipboard.

From the dashboard, run a check and use the two actions on the result:

- **Copy Caption** puts a ready to paste summary on the clipboard
- **Copy Image** puts the portal screenshot on the clipboard

On the LAN Safe Mode address, colleagues can do the same. They cannot edit
`.env`.

## TOTP helper {#totp}

The bot logs into portals that need a second factor. Rather than keeping a phone
authenticator beside the terminal, the TOTP helper imports the secret once:

```shell
taabg totp              # print the current code
taabg totp scan         # camera window, scan a QR
```

Accepts an `otpauth` URI, a migration URL, a Base32 secret, a QR image, or the
camera. The dashboard's TOTP page does the same from the browser and keeps the
result in process memory until you save it to `.env`.

## Feature switches {#switches}

Each check has its own flag, so a rollout can be partial:

```ini
FEATURE_UMAS_ENABLED=true
FEATURE_EMBASSY_ENABLED=false
```

A disabled check is filtered before it reaches the router, so a disabled feature
cannot be triggered by phrasing, no matter how it is worded.