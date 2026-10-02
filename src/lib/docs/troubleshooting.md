---
title: Troubleshooting
description: Captcha loops, VPN drops, saturated portals, and how to read the log.
---

Work down this list in order. The early entries are the common ones, and each
one tells you what to check next rather than only naming a symptom.

## The bot does not reply {#no-reply}

Almost always the intent filter, not a fault. Check these in order:

1. **Was there a target?** A check name on its own is silence by design.
2. **Was anything else in the message?** A discussion containing a keyword is
   silence on purpose. The message has to be a clean command.
3. **Was it negated?** `bukan`, `jangan` and `ga umas` all drop the request.
4. **Was the same request sent inside 30 seconds?** The dedup window ran it once
   and suppressed the second.
5. **Is the feature flag on?** A disabled check never reaches the router, so no
   phrasing will trigger it.

## A captcha keeps arriving {#captcha-loop}

Gladius asked for a captcha again shortly after you solved one. Almost always a
stale cookie.

```shell
# stop the service first, so nothing rewrites it
taabg stop
del "%USERPROFILE%\.taabg\data\gladius_cookies.json"
taabg start
```

The next request will do a full login and send one captcha to the debug group. If
it recurs within minutes rather than hours, the session is being dropped on every
request, which points at the account rather than the cookie.

A captcha in the technician group is a routing fault. It should only ever appear
in the debug group.

## The queue is stuck and the VPN is down {#vpn}

Expected behaviour, not a bug. When the internal VPN goes away the bot holds the
queue instead of reporting connection errors to a group of technicians.

```shell
taabg status          # look for the VPN line
taabg logs -f | findstr VPN
```

The waiting message is deleted from the group automatically. When the link comes
back, the queue resumes and held jobs are released.

Nothing needs restarting. If the log shows the link restored and the queue still
does not move, check `taabg doctor` for a Playwright problem.

## A portal is at capacity {#saturated}

This is the semaphore doing its job. Each portal has a hard limit because the
portal behind it will not tolerate more:

| Portal | Limit | If you need it now |
|---|---|---|
| Gladius | 2 | Usually clears on its own |
| ProMan | 1 | One job at a time, no workaround |
| IBooster | 1 | Wait for the running measurement |
| ACSIS | 1 | Longest queue, shared pool |
| Finpay | 2 | Rarely the bottleneck |

Raising a limit is not a fix. ProMan rejects a second tab and IBooster overwrites
the previous reading, so the work that fails is real work you already paid for.

The dashboard's meter shows the same state: neutral when idle, informational
while working, a warning at capacity, the error colour only when something is
actually failing.

## Reading the log {#log}

Lines are structured, which means they can be filtered:

```text
[15:04:05] [INFO] [a3f9c2d1] [gladius] session restored
[15:04:11] [WARN] [a3f9c2d1] [worker]  1 ONU off, retrying once
```

Four fields, in order: time, level, task id, component, message. The task id is
what ties a reply in the group to the lines that produced it.

```shell
taabg logs -f                     # follow today
taabg logs --date 2026-09-30      # a specific day
taabg logs -n 200                 # last 200 lines
```

Or use the dashboard, which is searchable and gives every task a permalink:

```text
/logs             explorer, filter by level
/logs/<taskId>    one task in full
```

## A job is running but nothing came back {#hung}

1. Check the semaphore meter for that portal. A saturated portal means the job is
   queued, not stuck.
2. Open the task by its id in the log and read the last lines.
3. A `WARN` that is followed by a retry is normal. A retry followed by silence is
   a portal that stopped answering, and the job fails at the retry limit.

## Chromium will not start {#chromium}

```shell
taabg doctor
```

The browser download lives outside the install directory, so a moved or cleaned
install folder is usually the cause. `doctor` reports the path it expected and
whether the download is present.

Running several scrapers at once on one machine can also exhaust shared memory.
The semaphore limits exist partly to prevent this.

## The dashboard will not load {#dashboard}

| Symptom | Cause |
|---|---|
| Nothing on `localhost:6655` | The service is not running. `taabg status` |
| Certificate warning on `:6656` | Expected. LAN Safe Mode is self signed |
| `403` on a colleague's machine | Correct. Sensitive endpoints are blocked in LAN mode |
| Page loads, no live updates | The log stream dropped. Reload |

## Getting a task id {#task-id}

Every request gets one, and it appears in the log line that starts the work. If
you need to ask someone else to look at a failure, the task id is what they need:

```text
[15:04:05] [INFO] [a3f9c2d1] [router] match UMAS 0.91 -> #4471
```

`a3f9c2d1` is the task id. `4471` is the request number. Either one locates the
job.