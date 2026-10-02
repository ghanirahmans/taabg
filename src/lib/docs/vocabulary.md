---
title: Vocabulary
description: The access network terms the bot uses, and the shape of each identifier.
---

Most of what `taabg` does is read from a portal and answer a question about one
piece of access hardware. That vocabulary is not invented here: it is the language
Indonesian field assurance teams already use. This page decodes it, because a
reader who does not know what an ODP is cannot picture what a request does.

Nothing on this page needs the bot. Read it once and the rest of the
documentation stops being opaque.

## The physical chain {#chain}

An access line is a chain of boxes between the exchange and the customer's house.
Each box has a name, and the bot's job is to read what each one says about a
given line.

```text
exchange
  |
  OLT          the card at the exchange that serves the area
  |
  ODP          the distribution point: a cabinet or a pole
  |
  splitter     passive, splits one feed into several
  |
  ONU          the unit at the customer end, what the router is
```

The technician's day is mostly about the two ends of that chain: is the ODP up, and
is the ONU silent.

## Identifiers {#identifiers}

Three identifiers matter. Each has a fixed shape, which is why the bot can find
one in a sentence without being told where it is.

| Identifier | Shape | Read as | Example |
|---|---|---|---|
| No Internet | 12 digits, starting `1` | one customer's line | `100000000000` |
| ODP code | `ODP-XXX-YY/NNN` | a cabinet serving many lines | `ODP-XXX-YY/001` |
| Phone | 10 digits | the same customer, old numbering | `0211111111` |

An ODP code names a place. A No Internet names a line. This is the distinction the
whole product turns on:

- `umas ODP-XXX-YY/001` means **every line behind that cabinet**
- `embassy 100000000000` means **that one line**

These examples are the shape and nothing else. A real No Internet begins with `1`
and the rest identifies an actual line; a real ODP code names an actual cabinet.

## Line terms {#line-terms}

**LOS**, Loss of Signal. The ONU is powered and connected but receiving nothing
from the exchange. A light on the customer's router, or a technician's time.

**Down**, or `padam` in the portals. Registered as disconnected, with a timestamp
for when it happened. Different from LOS: LOS is what the line is doing now, down
is what the exchange recorded.

**SN**, serial number. The hardware identifier printed on the ONT or modem. It is
what the exchange has on file, and it is often not what the label in the field
says, which is why looking it up is worth automating.

**FUP**, Fair Usage Policy. A cap on a line's data allowance, with the amount used
and the amount remaining. Read from a chart rather than a table, which is the only
check here that has to parse a rendered graph.

## Check names {#checks}

The seven checks are named the way the teams say them out loud. These are the
names you type, and what each one actually asks a portal.

| Name | The question behind it | Portal |
|---|---|---|
| `EMBASSY` | What does this line look like from the exchange? | Gladius |
| `UMAS` | How many lines behind this ODP are down? | ProMan, then IBooster |
| `JAM MATI` | Which of these lines has the exchange marked dead? | IBooster |
| `CREATE TICKET` | Raise an UNSPEC ticket for this ODP | ProMan |
| `CEK PAYMENT` | Has this customer paid? | Finpay |
| `ACS ONT` | What serial number does the exchange hold for this ONT? | ACSIS |
| `CEK FUP` | How much of this line's allowance is used? | ACSIS |

`UMAS` is short for *ukur massa*, a bulk measurement. `EMBASSY` is a portal name
that became the verb. `JAM MATI` is literal: dead time.

**UNSPEC** is an unspecified-fault ticket, the catch-all raised when something is
broken and nobody has established why. Creating one is a real side effect on a
shared system, which is why the bot guards it more tightly than anything else.

## Portal names {#portals}

Five portals. Four are internal Telkom systems reached over VPN; one is a public
billing page.

| Portal | What it holds | Access |
|---|---|---|
| **Gladius** | Customer line profile, signal, radius | Internal, VPN |
| **ProMan** | ODP to customer mapping, ticket creation | Internal, VPN |
| **IBooster** | ONU measurement and disconnect records | Internal, VPN |
| **ACSIS** | ONT hardware, data allowance | Internal, VPN |
| **Finpay** | Indihome billing | Public |

`ACSIS` is the operator-facing name for what the configuration calls ACS Booster.
Both appear in this documentation because both appear in the tool's own output.

## Terms from the bot itself {#bot-terms}

**Semaphore**, the concurrency limit on a portal. See
[Architecture](/docs/architecture) for why each one is a different number.

**Queue**, the waiting list between a request being read and a request being run.
See [Basic Usage](/docs/usage).

**VPN gate**, the check that pauses everything when the internal link drops. See
[Troubleshooting](/docs/troubleshooting).

**TOTP**, the six digit code from a phone authenticator that four of the five
portals require. `taabg totp` prints the current one.

**ALTCHA**, the "prove you are human" checkbox on the one public portal. It is not
a login, so `CEK PAYMENT` needs no credentials at all.
