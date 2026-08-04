# Phase 0 Summary

## What was completed

- Created the adjustable zero-cost MVP plan.
- Established Pakistan, PKR, privacy, cancellation, and no-payment baselines.
- Defined visitor, athlete, coach, and administrator behavior.
- Defined the minimal screen map.
- Added a formal scope-change process so later increases or decreases remain manageable.
- Built two responsive, interactive home/profile design previews.
- Added an automated preview-content and privacy test.
- Initialized a local Git repository.

## What Ali can test now

Ali can compare:

1. Calm Athletic — trust-led deep green and cream.
2. Energetic Marketplace — action-led navy, coral, and lime.

Both previews support:

- Mobile navigation
- Search feedback
- Sport filtering
- Coach profile opening/closing
- Service inclusions and exclusions
- PKR pricing
- Pakistan locations
- Public contact/location privacy

Testing steps are provided briefly in chat rather than stored as a separate testing-instructions file.

## Automated verification

Command:

```bash
node --test scripts/phase0-preview-check.mjs
```

Verified result before checkpoint: 2 tests passed, 0 failed.

## Operational issues encountered

### Codex authentication

Codex CLI returned HTTP 401 because its standalone authentication was unavailable. It changed no files. Hermes generated the previews directly, and the same automated test was used.

### Automated visual capture

Firefox's headless renderer failed in this environment with `RenderCompositorSWGL failed mapping default framebuffer`. The source/content tests passed, and normal-browser manual testing remains available. No large browser-rendering package was installed merely to create screenshots.

## Known limitations

- These are disposable previews, not the production application.
- Search/filter interactions demonstrate behavior but do not use a database yet.
- Preview photographs are temporary Unsplash links and require internet access.
- Booking button explains that booking arrives in Phase 4.
- Automated rendered screenshots remain unverified due to the headless-renderer limitation; Ali's normal-browser review is the visual acceptance gate.

## Selected direction

Ali selected the hybrid direction: Calm Athletic structure with the Energetic Marketplace search console and stronger primary-action buttons. This becomes the Phase 1 production baseline.

## Scope safety

Future scope changes will be recorded in `SCOPE.md`, impact-assessed, and applied from the latest known-good local Git checkpoint.
