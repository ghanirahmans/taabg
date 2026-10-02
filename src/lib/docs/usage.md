---
title: Basic Usage
description: Ask for a check in plain language, or run it from the browser.
---

There is no command syntax to learn for the checks themselves. You write what you
would say out loud, and the bot decides whether it is a request.

## In the group {#in-the-group}

```text
umas ODP-XXX-YY/001
embassy 100000000011
tolong cek tagihan 100000000011
cek sn ont 100000000011
cek fup 100000000011
```

A check name plus a target. That is the whole grammar.

The target shape depends on the check: an ODP code for `UMAS`, a 12 digit internet
number for most of the rest, a 10 digit phone number for the radius check. See
[Vocabulary](/docs/vocabulary).

The bot replies with the answer and a screenshot of the portal it read it from.
Nothing else is posted.

A request that needs a human, which today means a Gladius captcha, goes to the
debug group rather than to you. If your request seems to hang and the technician
group stays quiet, the thing you are waiting for is somewhere else.

## Replying instead of typing {#replying}

Three patterns exist because field work is conversational and retyping an ODP is
wasteful.

**Borrow the target.** Reply to a message that already contains the target, then
say only what you want:

```text
[replying to a message that contains ODP-XXX-YY/001]
cek odp
```

**Repeat it.** Reply to a bot result and say `lagi`, `ulang` or `repeat`. The target
carries over, and you can replace it in the same message.

**Ask for help with it.** Reply to anything and type `bantu`, `moban` or `tolong`,
mentioning the bot. The request is read out of the message you replied to.

One rule applies to all three: **the message you type must be a clean command.**
Discussing the case in the same message is ignored on purpose.

```text
[replying to a message that contains ODP-XXX-YY/001]
cek odp bg, splitter 2 masih los terus
```

That second one is silence, and it is the correct behaviour. A keyword inside
discussion is not an instruction, and a bot that acts on one becomes a nuisance in
a busy group faster than any other failure mode.

## What gets ignored {#ignored}

The filter is strict, and the strictness is the feature. All of these are silent:

- ordinary conversation, even when it contains a target
- case closing templates, which start with a ticket number or a phrase such as
  `done close`, and run to roughly a hundred other markers
- work reports
- negated requests, for example `bukan`, `jangan`, `ga usah`, `skip`, `nanti`
- a check name with no target attached, such as `umas` on its own
- a keyword in a reply that is a discussion rather than a command
- a request for a set top box serial, which is not supported and is refused rather
  than answered wrongly
- a prefix command that is not in the catalog, which is logged and not replied to,
  so a typo does not flood the group

When the bot does not reply, the first question is whether there was a target. The
second is whether anything else was in the message.

## The same request twice {#dedup}

Sending the same request twice inside 30 seconds runs it once. This is deliberate:
a double tap on a phone should not cost two portal sessions.

Mentioning the bot overrides the window, so `@taabg umas ODP-XXX-YY/001` runs again
straight away. Otherwise, wait out the window or change the target.

## Several targets at once {#multi}

More than one line in one message works, and each becomes its own job:

```text
embassy 100000000011
embassy 100000000012
```

A blank line separates a group of targets from the next check, which is how a
single message can carry two different requests without them being confused for one.

Two checks are exceptions. The dead line check joins its numbers into one job
rather than one job per number, because the portal takes them as a batch. And a
bulk measurement given an ODP code resolves to many numbers on your behalf, which
is the entire point of it.

## From the browser {#from-the-browser}

Open the dashboard, pick the check, enter the target, run it. The result comes back
on the page with the same screenshot the group would have received.

This path needs no Telegram session at all, which makes it the faster one when you
are debugging or when the group is noisy.

```text
http://localhost:6655     admin, this machine only
https://<lan-ip>:6656     read and run, for colleagues on the LAN
```

The result page offers **Copy Caption** and **Copy Image**, which put a paste-ready
summary and the portal screenshot on the clipboard.

## Running it as a service {#service}

```shell
taabg start      # background
taabg status     # exit 0 running, 3 stopped, 4 failed
taabg logs -f    # follow today's log
taabg restart    # stop then start
taabg stop
```

`status` uses its exit code as the answer, so it composes with a script or a
monitoring check without parsing text:

```text
taabg.service - Telkom Akses Assurance Bot
     Loaded: loaded (C:\Users\you\.taabg\.env)
     Active: active (running) since Fri 2026-09-25 09:12:33 WIB
    Process: 14820 (taabg)
     Memory: 38.4 MB
        CPU: 2.5%
   Log File: C:\Users\you\.taabg\logs\bot_2026-09-25.log
```

Only one instance runs at a time. A second `run` refuses rather than racing the
first, and tells you to stop it first.

`stop` waits for in-flight work to finish before exiting, so it is safe to run while
requests are queued. Anything still waiting when the drain period ends is written
out and picked up by the next start.

## Watching the queue {#watching}

The dashboard shows a semaphore meter per portal, live. Idle is neutral, working is
informational, at capacity is a warning, and the error colour appears only when
something is actually failing.

A meter pinned at capacity is normal under load and worth watching if it never
clears. See [Troubleshooting](/docs/troubleshooting).

The same information is in the log, filterable by level and addressable by task id:

```text
/logs           the log page, with a level filter and a search box
/logs/<taskId>  one task in full
```

## Next {#next}

- [Bot Commands](/docs/commands) for the short catalog and how naming works
- [Features](/docs/features) for what each check actually does
- [Troubleshooting](/docs/troubleshooting) for when a request does not come back
