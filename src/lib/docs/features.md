---
title: Features
description: The seven checks, the five portals behind them, and why each portal has its own limit.
---

Seven checks across five portals. This page is organised by portal, because the
portal is what determines the limits, the failure modes and the workaround, not the
check name. Three checks span two portals.

Names here match what you type in the group. See [Vocabulary](/docs/vocabulary)
for what each acronym stands for.

## Gladius {#gladius}

Customer line profile: signal level, loss, and the access node serving the line.

| | |
|---|---|
| Backs | `EMBASSY` |
| Sessions | 2 |
| Failure mode | Session expires and demands a captcha |

Gladius is the only portal that can stop mid-run and need a person. The bot handles
this with a single flight lock, so an expired session sends exactly one captcha
request to the debug group no matter how many jobs are waiting. Everyone blocked on
that session resumes together.

It takes a 12 digit internet number or a 10 digit phone number. The two land on
different pages, which is why a phone number works here and nowhere else.

A captcha appearing in the technician group means the routing is wrong. It should
never appear there.

## ProMan {#proman}

ODP lookup and ticket creation.

| | |
|---|---|
| Backs | `UMAS`, `CREATE TICKET` |
| Sessions | 1, strict |

ProMan is limited to one because it uses a single tab session and rejects a second
one rather than queueing it. `UMAS` runs here first to resolve an ODP into the list
of customers behind it, then hands off to IBooster. Give `UMAS` a 12 digit number
instead of an ODP code and it skips ProMan entirely and goes straight to IBooster.

Ticket creation is the one check with real side effects on a shared system, so it
is the most guarded. A message containing any of a list of words that indicate a
technician is closing a case rather than asking for a ticket kills the request
outright, and a CREATE_TICKET section over 120 characters is rejected rather than
truncated, because a truncated ticket is worse than no ticket.

## IBooster {#ibooster}

ONU measurement and dead line detection.

| | |
|---|---|
| Backs | `UMAS`, `JAM MATI` |
| Sessions | 1 |

A measurement overwrites the previous reading, so two concurrent measurements mean
one of them is wrong. That is why this limit is one and not two.

`JAM MATI` sends up to ten numbers per form submission and holds the slot across
all of them, so a check for forty lines is four submissions rather than forty. The
result lists lines still up first, then the ones that are down.

The screenshot cropping for the result table is a locked standard. The region it
crops to is commented as immutable in the source and should not be refactored, and
this page cannot show you which region without the repository.

## ACSIS {#acsis}

ONT hardware and data allowance.

| | |
|---|---|
| Backs | `ACS ONT`, `CEK FUP` |
| Sessions | 1 |

A shared pool with one session at a time, and the two checks share that one
session. Requests here queue behind each other more often than anywhere else, which
is why the dashboard gives it its own semaphore meter.

`ACS ONT` is the simplest check in the set and returns plain text, no screenshot: it
logs in, types the internet number, and reads the serial number the exchange holds.

`CEK FUP` is the hardest. The allowance is drawn as a chart rather than printed as a
table, so the values have to be read out of the rendered graph. It takes six
different strategies to open the right tab, because the tab control on that page
does not respond to an ordinary click, and it verifies the tab actually became
visible before trusting what is on it. The screenshot is the primary artefact here:
if the numbers cannot be parsed, the image is still sent, because a picture of the
chart is more use to a technician than a sentence saying it could not read it.

## Finpay {#finpay}

Billing.

| | |
|---|---|
| Backs | `CEK PAYMENT` |
| Sessions | 2 |

The only public portal, and the only check that needs no credentials at all. It
does not log in; it fills a customer number into a widget, ticks a proof-of-human
checkbox, and reads the result.

Read only, so two sessions are safe.

This check is also the one exception to the general silence rule: every other check
swallows network errors, but a Finpay network error is reported to the group.
Billing is the one thing a technician cannot check any other way, so a failure to
read it is worth saying out loud.

It needs both a word like `cek` or `tolong` and a billing word such as `tagihan`,
`payment`, `bayar` or `lunas`. One of the two alone is not enough, because `cek`
on its own would otherwise collide with the radius checks.

## Running a check from the browser {#web-cek}

Every check is also reachable from the dashboard, without sending anything to
Telegram. This is the useful path when you are at a desk and want the screenshot in
your clipboard.

From the result there are two actions:

- **Copy Caption** puts a ready to paste summary on the clipboard
- **Copy Image** puts the portal screenshot on the clipboard

On the LAN address colleagues can do the same. They cannot read or edit your
configuration. See [Installation](/docs/installation) for the two ports.

## Second factor helper {#totp}

Four of the five portals need a TOTP code. Rather than keeping a phone
authenticator beside the terminal, the helper imports the secret once:

```shell
taabg totp              # print the current code
taabg totp scan         # camera window, scan a QR
```

It accepts an otpauth URI, a migration URL, a raw Base32 secret, a QR image, or the
camera. Saving a secret hot-reloads a running bot, so you do not restart to add one.

## Turning checks off {#switches}

Each check has its own flag, so a rollout can be partial:

```ini
FEATURE_UMAS_ENABLED=true
FEATURE_EMBASSY_ENABLED=false
```

A disabled check is filtered before intent is even parsed, so no phrasing can
trigger it. This is how a check gets rolled back without stopping the service.
