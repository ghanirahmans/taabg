---
title: Architecture
description: How a request moves through the system, and why scraping never depends on chat.
---

`taabg` has one structural rule, stricter than a tool this size needs, and the
reason is practical: almost every hard bug in a scraper like this one happens where
a browser concern meets a chat concern. The layering exists to make that meeting
point a single, thin one.

## The rule {#rule}

Dependencies point inward only. Nothing that knows about portals is allowed to know
about Telegram, and nothing that knows about Telegram is allowed to know about
portals. They meet at exactly one interface, and that interface takes a string and
returns a struct.

In practice: the scraping code receives an internet number or an ODP code and a
deadline. It has no idea a chat id exists, and it cannot send a message even if it
wanted to.

Two consequences fall out of this for free:

- A portal check can be run from the terminal with no Telegram session at all,
  which is the fastest way to tell whether a fault is in the portal or in the bot
  around it.
- A portal bug can be reproduced without a chat fixture, so the test does not need
  a network to Telegram to prove a scraping fault.

## A request end to end {#request}

```text
message
  -> read        decide whether this is a request at all
  -> queue       FIFO, 30s dedup window, 50 deep
  -> gate        per-portal concurrency limit
  -> drive       one shared Chromium, one page per job
  -> reply       format the result, decide who sees it
```

### Read {#read}

Intent parsing is pure text in, a request object out. It finds the nearest check in
the message, attaches the nearest target to it, and applies a similarity threshold.

Below the threshold the message is dropped rather than guessed at. See
[Bot Commands](/docs/commands) for the threshold and what else gets dropped.

### Queue {#queue}

A first in, first out list guarded by a condition variable, 50 entries deep.

Two rules matter more than the ordering. The same request sent twice inside 30
seconds runs once, because a double tap on a phone should not cost two portal
sessions. And when the queue is full the oldest entry is dropped before the newest,
so a burst evicts stale work rather than the request someone is waiting on.

### Gate {#gate}

Each portal has its own limit, and a request arriving at a saturated portal waits.
It does not open a second browser tab and hope.

| Portal | Limit | Why that number |
|---|---|---|
| Gladius | 2 | Login is the fragile part, not the reading |
| ProMan | 1 | Single tab session, rejects a second outright |
| IBooster | 1 | A measurement overwrites the previous reading |
| ACSIS | 1 | Shared pool, one session at a time |
| Finpay | 2 | Read only, safe to pair |

These are not tuning knobs chosen for throughput. Each one is the most the portal
behind it tolerates, and raising one produces a wrong answer rather than an error:
two concurrent measurements means one reading is silently lost.

### Drive {#drive}

One Chromium, shared. Each job gets its own page, closed on every exit path.

Every network call and every browser operation carries a deadline and a task id. The
task id is what ties a line in the log back to the reply it produced, which is the
difference between reading a five minute scrape and guessing at it.

Browser contexts and pages are released with a deferred close. A leaked Chromium
context is the most expensive bug this shape of program can have, so the browser
also closes itself after five minutes with nothing running.

### Reply {#reply}

This is the one place the two worlds touch.

The technician group receives the result and the screenshot. Everything technical
goes to a separate debug group. That split is the reason a captcha image never
appears in front of a technician, and it is enforced in one place rather than
scattered across the checks.

## The VPN gate {#vpn}

Every portal but one is internal, so the link going down is not an error condition,
it is an ordinary event.

The bot checks the link on a timer. After three consecutive failed probes it
considers the link down, pauses the queue, and deletes its own waiting message from
the group. Work in flight that hits a network error is dropped silently rather than
reported, because a stack trace about a VPN is noise in a channel full of
technicians. When the link returns, the queue resumes and the held work is released.

The one exception is the billing check, which does report its network errors. See
[Features](/docs/features).

## The captcha lock {#captcha}

Gladius needs a human at a predictable and inconvenient moment. The bot handles
this with a single flight lock, so an expired session produces exactly one captcha
request no matter how many jobs are queued behind it.

```text
session expired
  -> one request wins the lock
  -> captcha image sent to the debug group
  -> everyone waiting blocks on the lock
  -> the answer releases all of them together
  -> lock released
```

A naive version of this asks for a captcha per job, so twenty queued requests
produce twenty captchas and twenty logins, each of which can expire the session
again. The lock is what turns that into one.

The answer is waited for generously, on purpose. A waiter is given far longer than a
single attempt needs, because a waiter that times out halfway through a login and
starts its own captcha is exactly the failure the lock exists to prevent.

## Logging {#logging}

Every line goes to two places: a readable line in the terminal, and a JSON record in
a dated file. The terminal line is padded into columns so it can be read by eye:

```text
[15:04:05] [INFO] [a3f9c2d1] [gladius] session restored
```

The JSON file is one object per line with a fixed set of keys, so it can be filtered
without parsing prose. See [Troubleshooting](/docs/troubleshooting) for how to read
both.

Secrets are scrubbed before anything is written: bot tokens, and any key named
token, password, secret, pass, otp, api hash, totp or auth key, have their value
replaced. Customer numbers are deliberately **not** scrubbed, because a log that
hides the line it is about is much less useful when you are reading it at two in the
morning.

## Design decisions worth knowing {#decisions}

Three decisions explain most of the behaviour you will notice, and none of them
look like accidents once you know why.

**Check names are English, aliases are not.** The names were migrated to English
canonical forms, and every Indonesian word people had always typed was kept as an
alias. Nothing that worked before the rename stopped working. If a command you used
to type goes quiet, the alias table is the first place to look.

**Ambiguity is dropped, not interpreted.** A message that could plausibly be two
things is silence. This is why the bot sometimes says nothing when you expected a
reply, and it is a deliberate trade: a missed request costs one message sent again,
a wrong one costs a portal session and the group's trust.

**A reply may borrow a target, but only from a clean message.** Field work is
conversational, and retyping an ODP is wasteful, so replying to a message that
contains the target and then asking for the check works. The borrow is refused if
your own message contains anything beyond the command, because that is the shape
discussion takes, and a keyword inside discussion is not an instruction.
