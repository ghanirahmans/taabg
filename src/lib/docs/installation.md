---
title: Installation
description: Install the binary, write .env, authenticate Telegram, and confirm health.
---

The installer is a single executable. It installs to your user profile, adds
itself to `PATH`, and leaves you with one configuration file to edit.

## Install {#install}

Run `taabg-vX.Y.Z.exe` and accept the defaults. It installs to:

```text
%USERPROFILE%\.taabg
```

That location was chosen deliberately. Installing per user rather than to
`Program Files` means the install never needs elevation, and every runtime path
resolves the same way for every account on the machine (ADR 0016).

## Configure {#configure}

Everything the bot needs is in one file:

```text
notepad %USERPROFILE%\.taabg\.env
```

The values that must be right before anything works:

```ini
# Telegram MTProto session
TELEGRAM_API_ID=1234567
TELEGRAM_API_HASH=0123456789abcdef0123456789abcdef
BOT_TOKEN=1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

# Groups
GROUP_ID=-1001234567890
DEBUG_GROUP_ID=-1009876543210

# Feature switches, one per check
FEATURE_UMAS_ENABLED=true
FEATURE_EMBASSY_ENABLED=true
```

The debug group is not optional in practice. It is where captcha images and
technical errors go, and if it is missing, a request that needs a human simply
stops.

The editor is validated on reload rather than at write time, so a mistake is
visible in the dashboard instead of at the next restart:

```shell
taabg reload
```

## Authenticate {#authenticate}

Telegram MTProto asks for a phone number, then a login code, then the two
factor password if the account has one:

```shell
taabg login tele
```

The session is written to disk and reused. This step only needs completing once
per machine.

## Confirm health {#confirm-health}

```shell
taabg doctor
```

`doctor` checks the pieces that are easy to get wrong and expensive to debug
later: the binary, the Playwright Chromium download, the presence and shape of
`.env`, and whether a Telegram session exists.

If it passes, start the bot:

```shell
taabg run
```

## Where things live {#layout}

```text
%USERPROFILE%\.taabg\
├── .env                     configuration, edited by hand
├── run\                     pid and lock files
├── data\                    Telegram session, portal cookies
└── logs\                    bot_YYYY-MM-DD.log, one file per day
```

Logs and cookies are the two paths worth knowing about. Cookies are what let
Gladius skip a login, and a stale cookie is the most common cause of a captcha
loop.

## Dashboard ports {#ports}

| Address | Audience | Access |
|---|---|---|
| `http://localhost:6655` | You | Everything, bound to `127.0.0.1` only |
| `https://<lan-ip>:6656` | Your team on the office LAN | Read and run only |

LAN Safe Mode uses a self signed certificate, so the browser will warn once.
Sensitive endpoints, which means reading and writing `.env`, the TOTP page and
the INC formatter, answer `403` in that mode. A colleague on the LAN can run a
check and read the results, and cannot read your credentials.

## Next {#next}

- [Basic Usage](/docs/usage) for making your first request
- [Troubleshooting](/docs/troubleshooting) if `doctor` complains