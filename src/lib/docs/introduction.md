---
title: Introduction
description: What taabg does, what a request looks like in the group, and where it runs.
---

A field assurance technician at PT Telkom Akses gets an ODP code in a Telegram
group and has to answer four questions about it: is the cabinet up, how many lines
behind it are dead, which customers are affected, and should a ticket be raised.

Today that means five browser tabs, a VPN client, and roughly twenty minutes of
copying numbers between systems that do not talk to each other.

`taabg` does that part. It is a Telegram bot and a browser dashboard, written in Go
as a single executable, that reads the request, opens the portal it needs, runs the
check, and posts the result with a screenshot back into the group.

It does not replace the five portals. It drives them, one at a time, the way a
person would.

If the vocabulary below is unfamiliar, [Vocabulary](/docs/vocabulary) decodes all of
it: what an ODP is, what a 12 digit internet number identifies, and what the check
names stand for.

## What a request looks like {#scene}

This is the whole product in four messages. A technician types a line of ordinary
language, with no prefix and no syntax:

```text
umas ODP-XXX-YY/001
```

The bot acknowledges in a word, because a measurement across a whole cabinet is
not instant:

```text
bntr
```

Back into the same group, once the measurement finishes:

```text
100000000013 tidak padam

100000000011 padam pada 2026-09-24 03:12:07
100000000012 padam pada 2026-09-24 04:51:33
```

Lines still up first, then a blank line, then the ones that are down with the
timestamp the exchange recorded. And a screenshot of the portal table those numbers
were read from, so they can be checked against the source rather than taken on
trust.

The wait is tens of seconds, and it grows with the size of the request. A cabinet
with three lines behind it and a cabinet with thirty are different amounts of work,
and the poll budget is set from the line count for that reason.

Nothing else appears. No stack trace, no browser window, no progress bar.

## Where it runs {#surfaces}

Three surfaces, one system. Each answers a different need, and they share the same
browser session, the same portal logins and the same queue.

| Surface | For |
|---|---|
| **Telegram group** | The work itself. This is where technicians already are. |
| **Browser dashboard** | Watching it work, and running a check from a desk. |
| **Terminal** | Installing, diagnosing, and the service controls. |

The group is the product. The dashboard is for the person responsible for the
group, who needs to see a semaphore per portal and know whether the last hour was
busy or stuck. The terminal is for whoever gets paged.

## Why a bot rather than a script {#why}

Two reasons, both about the group rather than about the code.

**Precision costs less than noise.** A wrong answer to a group of technicians costs
credibility, and a bot that replies to ordinary conversation costs it faster. So
`taabg` stays silent on almost everything: a keyword in a sentence is not a
request, a negated request is not a request, and a check name with no target is not
a request. Silence is the default and action is the exception. See
[Bot Commands](/docs/commands) for exactly what gets dropped.

**A portal needs a human once in a while.** One of the five, Gladius, shows an
image captcha when its session expires. Rather than fail, the bot asks the debug
group for a code, exactly once no matter how many jobs are waiting behind it, and
everyone blocked resumes together. That is the one moment a person is genuinely
required, so it is the only moment the bot asks.

## What it will not do {#limits}

This matters more than the feature list.

- **It will not run without the internal VPN.** Four of the five portals are
  internal. When the link drops the queue is held rather than filling a group with
  connection errors.
- **It will not push a portal past its concurrency limit.** Each portal has a hard
  ceiling set by what the portal tolerates, and work waits its turn instead.
- **It will not explain Telkom's processes.** It assumes the technician knows which
  check they need. It removes the browser work from a task that is already
  understood.
- **It will not guess.** Every one of the seven checks needs an explicit target, and
  a message that is ambiguous is dropped rather than interpreted.

## What it is written in {#shape}

Go, one executable, no runtime to install. It needs a Chromium download and a
Telegram session, and nothing else. There is no Python, no Node project and no
virtualenv on the machine that runs it.

Portability is a real constraint, not a preference: the machine is often a
technician's laptop rather than a server.

## Where to go next {#next}

- [Vocabulary](/docs/vocabulary) for what an ODP, an ONU, LOS and FUP mean. Read
  this first if any of the above was unfamiliar.
- [Features](/docs/features) for the seven checks and the five portals behind them.
- [Installation](/docs/installation) to run it.
