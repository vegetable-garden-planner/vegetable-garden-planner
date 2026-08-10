# Live dashboard QA evidence

- Branch guard: `feature/yj-work`
- Design read: authenticated user's real cultivation dashboard; retain the Figma greenhouse and emerald visual language while letting density follow stored schedules.
- Dials: variance 6, motion 3, density 6.
- Anti-slop: preserved the existing asymmetric photo/capsule composition, tokenized spacing and type, restrained motion, and content-driven card density.

## Verified user flow

1. Register and establish a Sanctum session.
2. Create a garden growing space.
3. Create and update a growing season.
4. Save an empty 8×4 layout, place lettuce, and persist it.
5. Generate two cultivation tasks and complete one.
6. Return to `/` and verify the home dashboard derives crop count, growing day, season progress, due tasks, harvest timing, and recommendations from the stored API data.

## Responsive browser checks

- 390px request (`clientWidth` 375 with scrollbar): single-column status layout, no horizontal overflow.
- 768px request (`clientWidth` 753 with scrollbar): two-column status layout, no horizontal overflow.
- 1280px request (`clientWidth` 1265 with scrollbar): desktop navigation visible, two-column status layout, no horizontal overflow.
- Browser console: no warnings or errors.

## Artifacts

- `home-390.png`: mobile hero.
- `home-390-status.png`: mobile crop status.
- `home-390-today.png`: mobile next-step/task transition.
- `home-768.png`: tablet hero and status transition.
- `home-1280.png`: desktop-layout viewport capture.

## Automated verification

- Laravel Pint: passed.
- Laravel feature tests: 48 assertions, no failures. The local checkout has no ignored `.env`, so Artisan reports only the expected missing-local-environment warning.
- ESLint: passed.
- Node tests: 136 passed.
- TypeScript: passed with `tsc --noEmit`.
- Next.js production build: passed for 28 routes.
- React Doctor changed scope: 82/100, reduced from 28 to 7 warnings. Remaining findings are pre-existing low-impact performance/style findings plus the intentional client-side auth redirect required by the separate Sanctum session API.

