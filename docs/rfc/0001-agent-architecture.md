---
RFC: 0001
Title: Agent architecture: long-term planning
Author: enriquefft
Status: Draft
Created: 2026-04-27
Tracking: https://github.com/siddharthvaddem/openscreen/issues/349
---

# Agent architecture: long-term planning

## Summary

Long-term architectural concerns exist for the agent surface beyond what PR #350 ships in scope. This RFC proposes a short planning window before the first split-PR lands, to surface and weigh these concerns properly.

## Why now

PR #350 establishes the agent-surface foundation. Once verbs start landing on top, retrofit cost grows with verb count. A few days of planning before the first split-PR ships is cheap insurance against compounding decisions.

## Designed

### State coordination

About 12 GUI/CLI desync, race, and attribution scenarios collapse to one decision: state source is currently hardcoded to disk. Editor-as-server + file-as-persistence + operation-log model proposed.

[Companion doc →](./0001-agent-architecture/state-coordination.md)

## Noticed, not yet planned

These surfaced during a filtered review of PR #350. They are starting points for investigation, not validated designs. Each may become a companion doc, fold into another, or be dropped after deeper review.

### Verbs do load-mutate-save inline; there is no pure transition primitive

**Where:** `cli/src/core/region-manager.ts:43-73` (and recurring across the file for six verbs in ~200 lines); `cli/src/core/project-manager.ts:237-263`.

**Why it may compound:** every verb today inlines the same `loadProject` → mutate → `saveProject` triplet. There is no `applyOperation(state, op) → state` primitive verbs compose around. Adding cross-cutting capabilities later — `--dry-run`, batch mode, schema migration on read, transactions across multiple ops, optimistic preview — means editing every verb body. With N verbs that's N sites of retrofit, mechanically.

This is distinct from state coordination: even in a single-process world with no GUI running, the verb's internal transition being a side effect rather than a value still compounds with verb count.

### No unified verb contract across transports

**Where:** Tier-1 verbs return objects via `outputSuccess` (`cli/src/commands/zoom.ts:18-35`). Tier-2 verbs spawn Electron and stream NDJSON `__cli` envelopes (`cli/src/core/electron-bridge.ts:111-208`). MCP exposes no verbs today, only a docs lookup (`cli/src/mcp-server.ts:86-102`).

**Why it may compound:** a verb today is whatever its `.action(...)` body happens to do — sync return, async streaming, or subprocess IPC. There is no `VerbDefinition` (input schema, run, result schema, streaming events) that all transports bind to. Per new transport (MCP-as-command-surface, in-process IPC from a running GUI, library API, eventual HTTP), the cost is N verbs × bespoke adapter.

This is distinct from state coordination: even if there were only one writer to one project at a time, the question of whether one invocation of one verb has a portable contract — independent of who invoked it — still compounds with verb count.

## Likely missing

Other concerns probably exist that nobody has surfaced yet. The point of the planning window is to find them, not just address what is listed above. Anyone reading PR #350 who notices something architectural that compounds with verb count should raise it here.

## Proposal

A short planning period — a few days — before split-PR-A (the `src/shared/` extraction) lands. Output: expanded companion docs for any noticed items that survive scrutiny, or explicit defer decisions for items that do not warrant a doc yet. The planning is parallel to the split work; nothing about restructuring PR #350 blocks on this.

Architectural decisions identified here can land incrementally — none require the whole edifice in place before they pay rent. State coordination is the most concrete because it already has a companion doc; the others need their own work before any commitment.

## References

- [State coordination](./0001-agent-architecture/state-coordination.md) — companion doc.
- PR #350 — `feat: CLI and Agent Interface for OpenScreen`.
- Issue #349 — umbrella feature request.
- [RFC convention](./README.md).
