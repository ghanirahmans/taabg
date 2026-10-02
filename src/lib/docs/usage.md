---
title: Basic Usage
description: Ask for a check in plain language, or run it from the browser.
---

There is no command syntax to learn for the checks themselves. You write what you
would say out loud, and the bot works out whether it is a request.

## In the group {#in-the-group}

```text
umas ODP-MDC-FAY/015
embassy 111209141110
tolong cek payment 111213094876
```

The target is what matters. An ODP, a 12 digit internet number, a customer name,
or an ONT serial number, depending on the check.

A reply arrives with the result table and a screenshot. Nothing else is posted.

## Replying instead of typing {#replying}

Three patterns exist because field work is conversational and retyping an ODP is
wasteful.

**Borrow the target.** Reply to a message that contains the target, then say only
what you want:

```text
[reply to "ODP-MDC-FAY/015 lagi 2 LOS"]
cek odp bg
```

**Repeat it.** Reply to a bot result with `lagi`, `ulang` or `repeat`. The target
carries over, and you can replace it in the same message.

**Ask for help with it.** Reply to anything, then type `bantu`, `moban` or
`tolong @bot`. The bot reads the request out of the message you replied to.

One rule applies to all three: the message you type must be a clean command.
Discussing the case in the same message, such as `cek odp bg, spl 2 masih los`,
is ignored on purpose. A keyword in a discussion is not an instruction, and
acting on one is how a bot becomes a nuisance (ADR 0036).

## What gets ignored {#ignored}

The filter is strict, and the strictness is the feature. These are all silent:

- ordinary conversation, even when it contains a target
- ticket closing templates such as `INC...`, `done close`, `SEGMENT : DCS`
- work reports
- negated requests, for example `bukan`, `jangan`, `ga umas`
- a check name with no target attached, such as `umas` on its own
- a keyword in a reply that is a discussion rather than a command

When the bot does not reply, the first question is whether the target was
present. The second is whether anything else was in the message.

## Same request twice {#dedup}

Sending the same request twice inside 30 seconds runs it once. This is
deliberate, because a double tap on a phone should not cost two portal sessions.

To actually run it again, either wait out the window or change the target:

```text
umas ODP-MDC-FAY/017
```

## From the browser {#from-the-browser}

Open the dashboard, pick the check, enter the target, run it. The result comes
back on the page with the same screenshot the group would have received.

This path needs no Telegram session at all, which makes it the faster one when
you are debugging or when the group is noisy.

Admin dashboard: `http://localhost:6655`
Team dashboard over the LAN: `https://<lan-ip>:6656`

## Running the service {#service}

```shell
taabg start      # background
taabg status     # exit 0 running, 3 stopped, 4 failed
taabg logs -f    # follow today
taabg restart    # stop then start
taabg stop
```

`taabg status` uses its exit code as the answer, so it composes with a script or a
monitoring check without parsing text.

## Watching a queue {#watching}

The dashboard shows a semaphore meter per portal. Idle is neutral, working is
informational, at capacity is a warning, and failing is the error colour. A meter
that stays at capacity is normal under load and worth watching if it never
clears.

If you only want the log, the same information is in the terminal band, filterable
by level and addressable by task id:

```text
/logs          the explorer
/logs/<taskId> one task, permalinked
```

## Next {#next}

- [Bot Commands](/docs/commands) for the short catalog and how naming works
- [Troubleshooting](/docs/troubleshooting) for when a request does not come back