# OpenScreen RFCs

Substantive design changes go through an RFC before they ship. The goal is to write down the decision and the reasoning once, in one place, so reviewers and future contributors aren't reconstructing it from PR threads.

This convention is deliberately lightweight. It is closer to a structured design doc than to a formal standards process.

## When to write an RFC

Open an RFC when a change:

- Introduces or reshapes a public surface (CLI verbs, MCP tools, IPC contracts, file schemas).
- Spans more than one PR or one subsystem.
- Locks in an architectural shape that would be expensive to reverse (state model, persistence format, transport layer).
- Has more than one credible answer and the tradeoffs deserve to be argued in writing.

You do *not* need an RFC for bug fixes, refactors, dependency bumps, single-file features, UI tweaks, or anything where the design fits in a PR description.

If you are unsure, open an issue first and ask.

## File layout

```
docs/rfc/
├── README.md                           # this file
├── 0001-agent-architecture.md          # index doc for RFC 0001
└── 0001-agent-architecture/            # companion docs (optional)
    ├── state-coordination.md
    └── audit-pr350.md
```

Naming:

- The index doc is `NNNN-kebab-case-title.md` at the top of `docs/rfc/`.
- Companion docs (deep dives, audits, prior-art surveys) live in a sibling directory `NNNN-kebab-case-title/`.
- Numbers are zero-padded to four digits, allocated sequentially from the next free number when the PR is opened. Don't reserve numbers in advance.

Most RFCs are a single file. The companion-doc layout is for cases where the index would be too long to read or where a section is a useful reference on its own.

## Frontmatter

Every RFC index doc starts with YAML frontmatter:

```yaml
---
RFC: 0001
Title: Agent architecture v1
Author: github-handle
Status: Draft
Created: 2026-04-27
Tracking: https://github.com/siddharthvaddem/openscreen/issues/349
---
```

Fields:

- **RFC** — the four-digit number.
- **Title** — short, human, matches the filename slug.
- **Author** — GitHub handle of the primary author. Co-authors listed in a `Co-Authors:` field if relevant.
- **Status** — one of `Draft`, `In Review`, `Final Comment Period`, `Accepted`, `Implemented`, `Rejected`, `Superseded`. See lifecycle below.
- **Created** — the date the RFC was first opened, ISO `YYYY-MM-DD`.
- **Tracking** — optional. URL to the umbrella issue or related PR.

Companion docs may copy the same frontmatter (with a note that they are companions to the parent RFC) or omit it. Either is fine.

## Sections

The index doc is expected to cover, at minimum:

- **Summary** — one paragraph. What and why, in plain English.
- **Motivation** — why now, what breaks without it.
- **Detailed design** — the actual proposal. Sketch APIs, schemas, file shapes.
- **Drawbacks** — honest cost. Refactor surface, learning cost, lock-in.
- **Alternatives considered** — at least two, with the reason each was not chosen.
- **Rollout plan** — how this lands incrementally, what gates the next step.

Other sections (prior art, unresolved questions, future work) as the topic demands. Don't pad sections that have nothing to say. A two-sentence "Drawbacks" is fine if there genuinely aren't many.

## Lifecycle

1. **Draft.** Author opens a PR adding the RFC file(s). PR description points at the umbrella issue if one exists. PR is marked `draft` on GitHub.
2. **In Review.** Author marks the PR ready for review. Discussion happens in PR comments. The RFC text is updated in place; PR threads are the audit trail.
3. **Final Comment Period (FCP).** When the design has stabilized, a maintainer announces FCP in the PR (typically 7 days). Anyone with concerns has until FCP closes to raise them. The frontmatter `Status` is updated to `Final Comment Period`.
4. **Accepted.** FCP passes without unresolved blockers. Maintainer merges the PR. `Status` becomes `Accepted` in the merge commit.
5. **Implemented.** Once the implementation lands (possibly across many PRs), a follow-up PR updates `Status` to `Implemented` and adds an `Implementation:` field linking the relevant PRs.
6. **Rejected** / **Superseded.** If the RFC is closed without acceptance, the PR is closed with a comment explaining why. If a later RFC supersedes it, that later RFC adds a `Supersedes: NNNN` field; the old RFC's `Status` becomes `Superseded` with a `Superseded-By: NNNN` field.

RFCs can be edited after acceptance only to reflect what actually shipped or to add cross-references. Substantive changes are a new RFC.

## Style

- Direct. Opinion is fine when it sharpens the argument.
- Cite code with `path/to/file.ts:line` so reviewers can jump to the referenced site.
- No filler, no hedging, no marketing voice. Treat the reader as a peer who has read the codebase.
- Keep sections short when there's nothing to add.

## Workflow

1. Branch off `main`: `git checkout -b rfc/NNNN-short-title`.
2. Add files under `docs/rfc/`.
3. Open a PR titled `rfc: NNNN <short title>`.
4. Mark draft until you want review.
5. Iterate in the PR. Companion docs go through the same review.
6. Maintainer merges on FCP close.

That's it. The point is the writing, not the process.
