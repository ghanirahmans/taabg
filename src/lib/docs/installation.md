---
title: Installation
description: Install the executable, write the configuration file, authenticate, and confirm health.
---

The installer is a single executable. It installs into your user profile, puts
itself on `PATH`, downloads the browser it drives, and leaves you with one
configuration file to edit.

A machine that runs this needs to be able to reach four internal portals over VPN,
so install it where the VPN client is already configured.

## Install {#install}

Run the installer and accept the defaults. It installs to:

```text
%USERPROFILE%\.taabg
```

Per user rather than into a system directory, which means the install never needs
elevation and every path resolves the same way for every account on the machine.

Two things are downloaded into that directory and are not part of the executable:
a browser automation driver, and a Chromium build. Neither is on your system
already, and both are only used to drive portals.

## Configure {#configure}

Everything the bot needs is in one file:

```ini
# Telegram: the account the bot logs in as
TELEGRAM_API_ID=1234567
TELEGRAM_API_HASH=0123456789abcdef0123456789abcdef

# Telegram: the groups it will listen in
# Names, not numeric ids. Comma separated for more than one.
SOURCE_GROUPS=Assurance North
DEBUG_GROUPS=Assurance Bot Support

# One triple per internal portal
GLADIUS_USERNAME=
GLADIUS_PASSWORD=
GLADIUS_TOTP_SECRET=
PROMAN_USERNAME=
PROMAN_PASSWORD=
PROMAN_TOTP_SECRET=
IBOOSTER_USERNAME=
IBOOSTER_PASSWORD=
IBOOSTER_TOTP_SECRET=
ACS_BOOSTER_USERNAME=
ACS_BOOSTER_PASSWORD=
ACS_BOOSTER_TOTP_SECRET=
```

`SOURCE_GROUPS` and `DEBUG_GROUPS` take group names, not numeric ids. The bot
resolves a name to an id itself, matching either exactly or against a normalised
form of the title, which means renaming a group does not break the configuration.

**The debug group is not optional in practice.** It is where captcha images and
technical errors go. If it is unset, a request that needs a human simply stops, and
the technician group gets a waiting message that never resolves.

The billing check is the exception: it uses a public page and needs no credentials
at all.

The rest of the settings cover feature switches, concurrency limits, log level, the
dashboard ports and the behaviour of the group listener. Rather than edit all of
them by hand, use the built-in editor, which validates as it goes and backs up
before it writes:

```shell
taabg config list         # everything, secrets masked
taabg config validate     # check the current file
taabg config set KEY VAL  # change one value
```

The dashboard has the same editor in the browser, masked summary or raw.

## Authenticate {#authenticate}

Telegram asks for a phone number, then a login code, then the two factor password
if the account has one:

```shell
taabg login tele
```

The session is written to disk and reused. This step is once per machine.

Running it again when a session already exists is a no-op, and it says so rather
than re-authenticating, because re-authenticating while the service is running
takes the session away from it.

The internal portals are authenticated separately, and you only need to do this when
a portal session has gone bad. See [Troubleshooting](/docs/troubleshooting).

## Confirm health {#confirm-health}

```shell
taabg doctor
```

Six checks, in order, each marked pass, fail or warn:

| Check | Asks |
|---|---|
| Binary | Is the executable the right shape |
| Directories | Does the install layout exist and is it writable |
| Config | Does the configuration file parse and have the required keys |
| Driver | Is the browser automation driver present |
| Browser | Is a Chromium build present |
| Launch | Can it actually start a browser and load a page |

`Launch` is a warning rather than a failure when the driver or browser is missing,
because that is a setup problem rather than a broken install, and the message says
which of the two is absent.

If everything passes:

```shell
taabg run
```

`run` in the foreground is what you want while you are working on something. Add
`--debug` for more detail. When you are ready to leave it alone, `taabg start`
runs the same thing in the background.

## Where things live {#layout}

```text
%USERPROFILE%\.taabg\
  .env                 configuration, edited by hand
  .env.backup.*        written before every config change
  logs\                bot_YYYY-MM-DD.log, one per day, zipped on rotation
  data\                Telegram session, job history, result screenshots
  cookies\             one file per portal session
  run\                 pid, state, and the handover queue
  cache\               temporary images, removed after sending
  tls\                 self signed certificate for the LAN address
  driver\  browser\    downloaded, owned by the tooling, safe to delete
```

Two paths are worth knowing. **Cookies** are what let a portal skip a login, and a
stale cookie is the most common cause of a captcha loop. **Logs** are the only
place the request history exists in text form.

`driver\` and `browser\` are the two directories safe to delete to reclaim space.
They are re-downloaded on the next run.

## Dashboard ports {#ports}

| Address | Audience | Access |
|---|---|---|
| `http://localhost:6655` | You | Everything, bound to `127.0.0.1` only |
| `https://<lan-ip>:6656` | Colleagues on the office LAN | Read and run only |

The LAN address is a separate mode, not a copy of the first. In it, anything that
reads or writes configuration answers `403` and says why. A colleague on the LAN can
run a check and read results, and cannot reach your credentials.

LAN mode uses a self signed certificate generated on first run, so the browser will
warn once. Set the LAN port to `0` to turn that listener off entirely.

## What needs a restart {#reload}

Most settings are picked up without a restart: feature switches, portal credentials,
portal addresses, concurrency limits and the log level. Saving the configuration
from either the terminal or the dashboard reloads them in place.

Three groups do need a restart, because they are bound when the process starts:
the dashboard ports, the Telegram session and API credentials, and the setting that
switches the group between natural language and prefix-only command mode.

## Next {#next}

- [Vocabulary](/docs/vocabulary) if the check names and identifiers are unfamiliar
- [Basic Usage](/docs/usage) for making a first request
- [Troubleshooting](/docs/troubleshooting) if `doctor` complains
