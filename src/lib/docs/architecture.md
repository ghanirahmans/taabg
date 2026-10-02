---
title: Architecture
description: Layer boundaries, the request pipeline, and why scraping never imports Telegram.
---

`taabg` follows a dependency rule that is stricter than it needs to be for a
tool this size, and the reason is practical: almost every hard bug in a scraper
like this one happens where a browser concern meets a chat concern. The layering
exists to make that meeting point a single, thin one.

## The rule {#rule}

Dependencies point inward only. A package never imports something that sits
further out.

```text
cmd/
  internal/bot, internal/cli    entry points
    internal/scraping           portal work, no chat
      internal/browser         one shared Chromium
    internal/router, internal/queue, internal/keywords
```

The rule that matters most: **`internal/scraping` does not import `internal/bot`
or `internal/web`.** The scraping layer receives strings and a `context.Context`,
and returns structs. It has no idea Telegram, a chat id or an HTTP handler
exists.

This is why `taabg scraper` can drive a portal from the terminal with no Telegram
session running. It is also why a portal bug can be reproduced in a test without
a chat fixture.

## A request end to end {#request}

```text
message
  -> router       match intent, drop noise
  -> queue        FIFO, 30s dedup window
  -> scraping     semaphore, browser, portal
  -> worker       format the reply
  -> bot          send to the group
```

### router {#router}

`internal/router` is pure text in, `*models.Request` out. It finds the nearest
command and applies a similarity threshold, 0.85 for most checks and 0.75 for
ticket creation. Below the threshold the message is ignored rather than guessed
at.

### queue {#queue}

`internal/queue` is a FIFO with a condition variable and a 30 second dedup
window. Sending the same request twice inside that window runs it once, which is
what happens when someone taps send twice on a phone.

### scraping {#scraping}

The facade in `scrape_service.go` owns one semaphore per portal. A request that
arrives at a saturated portal waits; it does not open a second browser context.

| Portal | Limit | Reason |
|---|---|---|
| Gladius | 2 | Login is the fragile part |
| ProMan | 1 | Rejects a second tab outright |
| IBooster | 1 | A measurement overwrites the last reading |
| ACSIS | 1 | Shared pool, one session at a time |
| Finpay | 2 | Read only, safe to pair |

### worker {#worker}

`internal/bot/worker.go` formats the result and decides who sees it. The
technician group gets the result and the screenshot. Everything technical goes to
the debug group.

## Context and cancellation {#context}

Every network call and every Playwright operation takes a `context.Context`
carrying a task id. That id is what lets a log line be traced back to the request
that produced it, which is the difference between debugging a five minute scrape
and guessing at it.

Browser contexts and pages are released with a deferred close on every path. A
leaked Chromium context is the most expensive bug this shape of program can have.

## The captcha gate {#captcha}

Gladius needs a human at a predictable and inconvenient moment. The bot handles
this with a single flight lock, so an expired session produces exactly one
captcha request no matter how many jobs are queued behind it.

```text
session expired
  -> acquire lock (one winner)
  -> send captcha to the debug group
  -> broadcast the result to every waiting job
  -> release lock
```

## Logging {#logging}

All logging goes through `internal/utils`, which writes a human readable line to
the terminal and a JSON record to a daily file. Two filters run over everything:

- bot tokens, passwords, TOTP secrets and API hashes become `[REDACTED]`
- any bare six digit sequence becomes `[REDACTED]`, because that is the shape of
  a login code

The second filter is deliberately blunt. It will occasionally redact something
innocuous, and that trade is worth making.

## Design decisions {#decisions}

Every structural decision that changed the shape of the system has a record in
`docs/adr/`. Two of them explain most of the behaviour you will notice:

- **ADR 0013** moved command naming to English canonical names while keeping the
  old Indonesian terms as aliases, so nothing a user typed before broke.
- **ADR 0014** made intent strict. Ambiguous messages are dropped rather than
  interpreted, which is why the bot sometimes stays quiet when you expected a
  reply.