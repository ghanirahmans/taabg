---
title: Bot Commands
description: Direct-reply commands, the prefix, and the phrases the bot ignores on purpose.
---

Scraping requests do not use commands. The catalog below covers the bot's own
housekeeping, so that nobody has to learn syntax to get an answer.

## The catalog {#catalog}

Every command takes the `taabg` prefix in the group.

| Command | Also accepted | Does |
|---|---|---|
| `taabg help` | `bantuan`, `menu`, `?` | List every direct-reply command |
| `taabg status` | `monitoring`, `dashboard` | System and queue snapshot |
| `taabg ping` | | Connection test, replies `pong` |
| `taabg login gladius` | `signin` | Start Gladius login and send the captcha |
| `taabg hello` | `hi`, `hey`, `halo`, `hai`, `hallo` | Greet the bot back |

`taabg help` builds its text from the same catalog that parses it, so the examples
in the reply are always the forms that actually work.

## Names and aliases {#names}

Canonical names are English. The Indonesian terms that people have always typed
are kept as aliases, so nothing that worked before a rename stopped working.

```text
bantuan  ->  help
monitoring -> status
signin   ->  login
```

This was a deliberate migration rather than a breaking change (ADR 0013). If a
command you used to type now goes quiet, the alias table is the first place to
look.

## The prefix {#prefix}

`taabg` is the prefix, and it is effective rather than cosmetic. A bare `status`
in a busy group is more likely to be a technician talking to a colleague than a
request for a snapshot, so the bare form is ignored.

The prefix is configurable, and it is applied to the help text as well, so the
examples in `help` follow whatever prefix you set.

## Commands the bot ignores {#ignored}

An unrecognised word is not an error. The bot logs it and stays silent, because
in a group chat an unrequested reply is worse than no reply.

This is the same rule that keeps check requests out of the command catalog. They
go through the router instead, on natural language, because a technician should
not have to remember a template to ask a question they already know how to ask.

## Strict intent {#intent}

Intent has to be explicit. The router drops a message unless it is confident
about both the check and the target:

- a check name with no target is silence, not a prompt
- a negated request is silence, whatever else it contains
- a keyword inside a discussion is silence, even in a reply

If the bot ignores something you expected it to take, that is this rule working.
See [Basic Usage](/docs/usage) for the three reply patterns that are allowed to
borrow a target.

## Threshold {#threshold}

Matching is fuzzy, with a similarity threshold:

| Check | Threshold |
|---|---|
| Most checks | 0.85 |
| `CREATE_TICKET` | 0.75 |

Ticket creation runs lower because technicians describe it in more varied ways
than they describe a radius check. Everything else stays high, because a false
positive costs a portal session.

Below the threshold the message is dropped. Raising the threshold makes the bot
quieter; lowering it makes it more eager and more likely to be wrong.

## Related commands {#related}

Two commands sit outside the group, on the machine:

```shell
taabg totp        # current 6 digit code
taabg totp scan   # camera window, scan a QR
taabg doctor      # check the install
taabg scraper     # one portal call, no Telegram
```

`taabg scraper` exists because the scraping layer has no dependency on Telegram.
Running it directly is the fastest way to tell whether a problem is in the portal
or in the bot around it.