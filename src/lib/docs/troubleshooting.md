---
title: Troubleshooting
description: Silence, captcha loops, a paused queue, saturated portals, and how to read the log.
---

Work down this list in order. The early entries are the common ones, and each one
tells you what to check next rather than only naming a symptom.

## The bot does not reply {#no-reply}

Almost always the filter, not a fault. Check these in order:

1. **Was there a target?** A check name on its own is silence by design.
2. **Was anything else in the message?** A discussion containing a keyword is
   silence on purpose. The message has to be a clean command.
3. **Was it negated?** `bukan`, `jangan` and `ga usah` all drop the request.
4. **Did it look like a case report?** A ticket number or a closing phrase anywhere
   in the message drops it.
5. **Was the same request sent inside 30 seconds?** The dedup window ran it once
   and suppressed the second. Mentioning the bot overrides this.
6. **Is the check enabled?** A disabled check never reaches the parser, so no
   phrasing will trigger it.

If you want the actual reason rather than a guess, the log records every message it
dropped and why. See [Reading the log](#log).

## A captcha keeps arriving {#captcha-loop}

Gladius asked for a captcha again shortly after you solved one. Almost always a
stale cookie.

```shell
# stop first, so nothing rewrites the file while you delete it
taabg stop
del "%USERPROFILE%\.taabg\cookies\gladius_cookies.json"
taabg start
```

The next request does a full login and sends exactly one captcha to the debug group.

If it recurs within minutes rather than hours, the session is being dropped on every
request, which points at the account rather than at the cookie. Check the debug
group: the repeated login attempts and their errors are there, not in the technician
group.

A captcha appearing in the technician group is a routing fault. It should only ever
appear in the debug group.

## The queue is paused and the VPN is down {#vpn}

Expected behaviour, not a bug. Four of the five portals are internal, so when the
link goes away the bot holds the queue rather than reporting connection errors to a
group of technicians.

```shell
taabg logs -f
```

Look for the link going down and coming back:

```text
[21:02:14] [WARN] [1d5b8fa0] [VPN] VPN disconnected! Pausing request queue...
[21:09:41] [INFO] [1d5b8fa0] [VPN] VPN connection restored! Resuming request queue.
```

While the queue is paused, workers wait and say so in the log rather than failing.
The waiting message is deleted from the group automatically, so the channel does not
fill with promises that are not being worked on.

Nothing needs restarting. If the log shows the link restored and the queue still
does not move, run `taabg doctor` and look at the browser checks.

The link is considered down after three consecutive failed probes rather than one,
so a single dropped packet does not pause a busy afternoon. Detection is by
interface name and route first, with a TCP probe to an internal host as the
fallback.

## A portal is at capacity {#saturated}

This is the concurrency limit doing its job. Each portal has a hard ceiling because
the portal behind it will not tolerate more:

| Portal | Limit | If you need it now |
|---|---|---|
| Gladius | 2 | Usually clears on its own |
| ProMan | 1 | One job at a time, no workaround |
| IBooster | 1 | Wait for the running measurement |
| ACSIS | 1 | Longest queue, shared pool |
| Finpay | 2 | Rarely the bottleneck |

A saturated portal means a job is **queued, not stuck**. There is no timeout on the
wait and no error, which is deliberate: the alternative is failing work that would
have succeeded a minute later.

Raising a limit is not a fix. ProMan rejects a second tab, and IBooster overwrites
the previous reading, so the work that fails is real work you already paid for.

The dashboard's meter shows the same state: neutral when idle, informational while
working, a warning at capacity, the error colour only when something is actually
failing.

## The queue is full {#queue-full}

At 50 waiting entries the oldest is dropped to make room, and if it is still full
the newest is dropped too. The group gets:

```text
Antrian penuh, silakan coba lagi dalam beberapa saat.
```

Both drops are in the log at warning level, with the reason. If you are seeing this
regularly, the answer is more portal capacity or a shorter queue, not a bigger
number.

## Reading the log {#log}

Two formats, one logger. The terminal gets a padded line you can read by eye:

```text
[15:04:05] [INFO] [a3f9c2d1] [gladius] session restored
[15:04:11] [WARN] [a3f9c2d1] [worker]  1 ONU off, retrying once
```

Four fields in order: time, level, task id, component, message. Levels are `DEBUG`,
`INFO`, `WARN` and `ERROR`. `WARN` and above also go to standard error, so
`taabg run 2> warnings.txt` separates them.

The file is one JSON object per line, with a fixed set of keys, which is what makes
it filterable:

```text
%USERPROFILE%\.taabg\logs\bot_2026-09-25.log
```

```shell
taabg logs -f                     # follow today
taabg logs --date 2026-09-30      # a specific day
taabg logs -n 200                 # last 200 lines, default is 50
```

Logs rotate on a date change, and the previous day is zipped rather than deleted.
`logs -f` reopens on the new file at midnight without being restarted.

Or use the dashboard, which is searchable and gives every task a permalink:

```text
/logs             the log page, filter by level, search by text
/logs/<taskId>    one task in full
```

If a day has no file yet, the log page falls back to the log and zipped files from
the last seven days and marks them as read from disk.

## A job is running but nothing came back {#hung}

1. Check the semaphore meter for that portal. A saturated portal means the job is
   queued, not stuck.
2. Open the task by its id and read the last lines.
3. A `WARN` followed by a retry is normal. A retry followed by silence is a portal
   that stopped answering, and the job fails when it hits the retry limit.

Every request gets a fresh three minute budget. A login round inside that budget
does not eat the time available for the actual portal work, which is deliberate: a
slow login should not cause the scrape that follows it to time out.

## Chromium will not start {#chromium}

```shell
taabg doctor
```

The driver and the browser download live outside the executable, so a cleaned or
moved install directory is the usual cause. `doctor` reports the paths it expected
and whether the download is present, and names which of the two is missing.

Running many scrapers on one machine can also exhaust shared memory. The
concurrency limits exist partly to prevent this, and `doctor` launches the browser
with the flags that work around it.

The browser also closes itself after five minutes with nothing running. If memory
still creeps, `taabg restart` gives a clean slate.

## The dashboard will not load {#dashboard}

| Symptom | Cause |
|---|---|
| Nothing on `localhost:6655` | The service is not running. `taabg status` |
| Certificate warning on the LAN address | Expected. It is self signed |
| `403` on a colleague's machine | Correct. Configuration endpoints are blocked in LAN mode |
| Page loads, no live updates | The live stream dropped. Reload |
| Port already in use | Another process holds it. Five retries, then it gives up |

## Credentials look wrong but the portal works {#creds}

Portal credentials are validated on login, not on use. A change to a password in
the portal does not invalidate the saved session, so the bot keeps working with the
old one until it expires, and then the failure looks sudden.

If a credential was rotated, log into that portal once from the terminal to confirm
it, then let the next expiry do the rest. See [Bot Commands](/docs/commands) for
the per portal login commands.

## Getting a task id {#task-id}

Every request gets one, and it appears in the log line that starts the work. If you
need to ask someone else to look at a failure, the task id is what they need:

```text
[15:04:05] [INFO] [a3f9c2d1] [router] match UMAS 0.91 -> #4471
```

`a3f9c2d1` is the task id, truncated to eight characters. `4471` is the request
number. Either one locates the job, and the same id appears on every line that
request produced, across both log formats.
