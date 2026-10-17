# Temporary public-access checklist

**Prepared 2026-10-17; no visibility change was requested or performed by this handoff.** This repo should remain under its owner's control. Making it public is an owner decision, not a step Claude should take automatically.

## Before making it public
- Understand that **temporary public is still a publication**. Visitors, bots and mirrors may download or retain code/assets/commit history. Returning to private does not retract copies already obtained.
- The existing source repository has **no general open-source license for original game code and art**. Public visibility does not grant anyone a right to redistribute; third-party models have their own MIT/CC0 terms and notice obligations.
- Never commit or publish API keys, tokens, browser saves, Termux environment config with secrets, personal files, device IDs, service credentials, or custom auth data.
- A limited 2026-10-17 static check of **335 tracked paths** plus high-confidence regex checks across **13 Git commits** reported **no hits for the tested patterns**. This is **not a complete security review or license clearance**. Review the repository and commit history yourself before changing visibility.
- Confirm the public-facing README and screenshot descriptions are accurate; refer to `screenshots/README.md` for legacy/current distinction.

## Claude app read vs. write
- **Public read access does not confer write access.** A read-only repository connector cannot save files back to GitHub even when the repo is public.
- If Claude supports an authenticated private GitHub connector, it may be preferable to making the repository public. Capability depends on the user's Claude setup.
- If Claude has authorized GitHub write/PR capability, direct it to create a **research-only branch/PR** containing only `docs/claude/` documents.
- Otherwise, have Claude return full Markdown files or a patch; the owner can upload them separately. The ready-to-send request is `docs/claude/PROMPT-FOR-CLAUDE.md`.
- If the repo is made public, return it to private when research access is no longer needed, while recognizing that already-copied data remains outside your control.

## Avoid leaking the phone's local environment
A remote Claude session cannot browse the device's `127.0.0.1:4186` origin or access Chrome localStorage. The repository captures game source and the authoritative docs, **not** live phone access, player save data or verified physical GPU metrics.
