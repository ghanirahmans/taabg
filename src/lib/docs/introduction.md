---
title: Introduction
description: What taabg automates across Telkom assurance portals, and who it is for.
---

`taabg` is a Telegram bot and a browser dashboard that carry out Telkom access
assurance work that would otherwise mean logging into five internal portals by
hand. It reads a request written in ordinary language, opens the portal it needs,
runs the check, and posts the result with a screenshot back into the group.

It is written in Go and ships as a single binary. There is no Python, no Node and
no virtualenv on the machine that runs it.

## Who it is for

A technician or team lead who already knows the job. The bot does not explain
Telkom's processes or suggest what to check. It removes the browser work from a
task that is already understood, and it keeps a record of what ran.

## The checks

Seven checks are implemented and documented:

| Check | What it answers | Portal |
|---|---|---|
| `UMAS` | How many ONUs behind this ODP are down | ProMan, then IBooster |
| `EMBASSY` | What is the customer's radius and signal picture | Gladius |
| `JAM MATI` | Is this ONU registered as dead | IBooster |
| `CREATE TICKET` | Raise an UNSPEC ticket for an ODP | ProMan |
| `CEK PAYMENT` | Is the Indihome bill settled | Finpay |
| `ACS ONT` | What is registered against this ONT serial number | ACSIS |
| `CEK FUP` | First up and payment status | Finpay |

## The three entry points

Three commands start the same system, and the difference is only where it runs.

```shell
taabg run       # the bot, in this terminal
taabg start     # the bot, as a service
taabg scraper   # one portal call, no Telegram
```

`taabg run` is what you use while you are working on something. `taabg start` is
what you leave running. `scraper` exists because the scraping logic has no
dependency on Telegram at all, so it can be exercised directly during debugging.

## What it looks like in a group

A technician types a request in plain language. No command prefix, no syntax to
remember:

```text
umas ODP-MDC-FAY/015
```

The bot replies with a table of the ONUs it found and a screenshot of the portal
result. Nothing else appears in the group. Technical errors and captcha requests
go to a separate debug group, so the technician channel stays readable.

## What it deliberately does not do

This matters more than the feature list, because the bot lives in a busy group
chat rather than in a private console.

- **It does not respond to ordinary conversation.** A message that mentions a
  keyword in passing is not a request. See
  [Bot Commands](/docs/commands).
- **It does not run when the VPN is down.** A queue is held instead of filling
  the group with connection errors.
- **It does not retry a portal past its concurrency limit.** Work waits its turn.
  See [Troubleshooting](/docs/troubleshooting).