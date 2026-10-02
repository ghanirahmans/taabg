---
title: Bot Commands
description: The short catalog of direct commands, and the much longer list of things it ignores.
---

Check requests do not use commands. The catalog below covers the bot's own
housekeeping, so that nobody has to learn syntax to get an answer.

## The catalog {#catalog}

Every command takes the `taabg` prefix in the group.

| Command | Also accepted | Does |
|---|---|---|
| `taabg help` | `bantuan`, `menu`, `?` | List every direct command |
| `taabg status` | `monitoring`, `dashboard` | System and queue snapshot |
| `taabg ping` | | Connection test, replies `pong` |
| `taabg login gladius` | `signin` | Start a Gladius login and send the captcha |
| `taabg hello` | `hi`, `hey`, `halo`, `hai`, `hallo` | Greet the bot back |

`taabg help` builds its text from the same catalog that parses it, so the examples
in the reply are always the forms that actually work. It also lists a couple of
check examples, because the checks have no prefix and might otherwise look
unreachable.

## Names and aliases {#names}

Canonical names are English. The Indonesian words people had always typed are kept
as aliases, so nothing that worked before the rename stopped working.

```text
bantuan    ->  help
monitoring ->  status
signin     ->  login
```

This was a deliberate migration rather than a breaking change. If a command you used
to type now goes quiet, the alias table is the first place to look.

## The prefix {#prefix}

`taabg` is the prefix, and it is effective rather than cosmetic. A bare `status` in
a busy group is far more likely to be a technician talking to a colleague than a
request for a snapshot, so the bare form is ignored.

Three spellings work, and case does not matter: `taabg hello`, `/taabg hello`, and
`/taabg@YourBot hello`.

The prefix is configurable and is applied to the help text as well, so the examples
in `help` follow whatever you set.

The group listener has three modes. The default accepts both natural language and
prefixed commands. `prefix` mode disables natural language entirely, for a group
where only a known few people use the bot. `legacy` accepts the older unprefixed
slash forms.

## Commands the bot ignores {#ignored}

An unrecognised word is not an error. The bot logs it at the lowest level and stays
silent, because in a group chat an unrequested reply is worse than no reply.

This is the same rule that keeps check requests out of the catalog. They are parsed
from natural language, because a technician should not have to remember a template
to ask a question they already know how to ask.

## Strict intent {#intent}

Intent has to be explicit. A message is dropped unless the bot is confident about
both the check and the target:

- a check name with no target is silence, not a prompt
- a negated request is silence, whatever else it contains
- a keyword inside a discussion is silence, even in a reply

The negation list is short and worth knowing, because it is not guessable: `bukan`,
`jangan`, `ga usah`, `gak usah`, `ga perlu`, `gak perlu`, `skip`, `nanti`, `nanti
dulu`, `nggak`, `tidak perlu`, `tidak usah`, `no need`. One of them anywhere in the
line drops the line.

The discussion filter is broader still. It matches around a hundred markers that
technicians use when closing a case or writing up a report, so a message that looks
like a request but reads like a report is dropped.

## Threshold {#threshold}

When nothing matches exactly, matching falls back to a similarity score.

| Check | Threshold |
|---|---|
| Most checks | 0.85 |
| Ticket creation | 0.75 |

Ticket creation runs lower because technicians describe it in more varied ways than
they describe a radius check. Everything else stays high, because a false positive
costs a portal session.

Below the threshold the message is dropped. Raising it makes the bot quieter;
lowering it makes it more eager and more likely to be wrong.

## Courtesy {#courtesy}

Replying to the bot with a thank you gets a thank you back, chosen at random from a
small pool so it does not read as a machine.

It fires when the thanks is a reply to the bot's own message. Replying to a human
with a thank you never triggers it, because that is just conversation.

There is a looser variant that does not need a reply, but only when the bot's last
message is still the most recent one, within five messages and thirty seconds, and
at most once every fifteen seconds per chat.

Thanks mixed in with an actual request is left to the request. The bot does not
greet you and then do your work.

## On the machine {#related}

These are not group commands. They run in the terminal:

```shell
taabg doctor         # check the install, six checks
taabg status         # is it running, as JSON if you ask
taabg totp           # the current six digit code
taabg totp scan      # camera window, scan a QR
taabg config edit    # edit configuration with your editor
taabg test-scrape    # drive one browser without Telegram
```

`taabg test-scrape` is the fastest way to tell whether a problem is in the browser
automation or in the bot around it, because it opens a real browser page and prints
what it found, with no Telegram session and no portal credentials involved.

Portal logins can also be checked one at a time from the terminal, which is useful
when a session has gone bad and you do not want to disturb a running service:

```shell
taabg login proman    # opens a visible browser, verifies the credentials
taabg login gladius   # non headless, up to three captcha attempts
```
