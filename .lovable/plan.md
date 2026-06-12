
This is a large multi-week build. I'll ship it in 5 phases, each independently usable, so you can test as we go. AI calls stay on the **Lovable AI Gateway** (no GEMINI_API_KEY needed). Claude tasks (exam prediction, concept maps) will use `anthropic/claude-sonnet-*` via the same gateway — no separate ANTHROPIC_API_KEY needed either. YOUTUBE_API_KEY and VAPID keys will be requested when their phase begins.

---

## Phase 1 — Study core upgrades (Batch A)

**Database**
- Add columns to `flashcards`: `easiness FLOAT DEFAULT 2.5`, `interval INT DEFAULT 1`, `repetitions INT DEFAULT 0`, `next_review_date TIMESTAMPTZ DEFAULT NOW()`.
- Add `difficulty_level TEXT DEFAULT 'medium'` to `uploads` (the project's "topics" table).
- New table `study_sessions` (user_id, upload_id, duration_minutes, session_type) with RLS + GRANTs.

**Frontend**
- `FlashcardsPage.tsx`: replace mastered toggle with SM-2. Add 0–5 quality buttons (Again / Hard / Good / Easy). "Due today" count badge. SM-2 algorithm runs client-side, syncs via Supabase.
- Add Web Speech API speaker icon on flashcard front (TTS).
- New `PomodoroTimer` component (25/5 cycles) inserted on FlashcardsPage and QuizPage; logs to `study_sessions` on each completed cycle.
- `QuizPage.tsx`: after each attempt compute accuracy, update `uploads.difficulty_level`, pass to next quiz generation.
- Update `analyze-slides` edge function to accept `difficulty` param in the quiz prompt.

---

## Phase 2 — YouTube Videos tab (Batch B)

**Secret request**: `YOUTUBE_API_KEY` (Google Cloud Console → YouTube Data API v3).

**Database**: `video_recommendations` (upload_id, video_id, title, thumbnail, channel_name, duration, relevance_score, reason, watched, cached_at) + RLS via topic ownership.

**Edge function `fetch-videos`**: YouTube search → Gemini re-rank via Lovable Gateway → cache top 3 per topic. 30-day cache refresh.

**Frontend**: New "Videos" tab in `TopicsPage.tsx`. Thumbnail cards with relevance badge, "Watched" toggle (logs `study_sessions` with session_type='video').

---

## Phase 3 — Claude-powered insights (Batch C)

**Database**: `exam_predictions`, `concept_maps` tables with RLS + GRANTs.

**Edge functions** (both via Lovable Gateway, model `anthropic/claude-sonnet-4-5`):
- `predict-exam` — triggered when user has 3+ `past_questions` rows for same subject. Returns frequent topics, predictions, gaps, study plan.
- `generate-concept-map` — extracts nodes/edges from slide text.

**Frontend**:
- "Exam Insights" tab on `PastQuestionsPage.tsx` with subject grouping + prediction display.
- "Map" tab on `TopicsPage.tsx` rendering D3 force-directed graph (adds `d3` dependency).

---

## Phase 4 — Social & marketplace (Batch D)

**Database**: `study_groups`, `group_members`, `group_topics`, `group_messages`, `marketplace_listings`, `marketplace_purchases`, `listing_reviews`, `weekly_leaderboard_snapshots`. All with RLS + GRANTs. Realtime enabled on `group_messages`.

**Frontend pages**:
- `/groups` — list/create/join groups via invite code, member list, share topic, group chat (Supabase Realtime), group quiz launcher with leaderboard.
- `/marketplace` — browse flashcard decks, ratings, Paystack checkout (reuses existing `paystack-subscribe` pattern). Creator earns 80%.
- `/leaderboards` — weekly opt-in ranking; profile fields for university/course; filters; "Top Studier" badge.

**Edge functions**:
- `paystack-marketplace-checkout` & webhook handler for deck purchases.
- `snapshot-leaderboards` (weekly cron).

**Performance page enhancements**: GitHub-style heatmap (past year), per-topic weakness chart, video watch time in totals.

**Weekly report**: `weekly-report` edge function (Gemini, cron Monday 06:00 Africa/Accra).

---

## Phase 5 — PWA + Push notifications

**Secret request**: `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` (I'll generate them in chat for you to paste).

**PWA**: Add `vite-plugin-pwa` with guarded registration wrapper (per the project's PWA skill rules — never registers in Lovable preview/dev/iframe). NetworkFirst for HTML; CacheFirst for hashed assets and `/api/flashcards`-style data. Offline banner component. IndexedDB queue for quiz attempts made offline.

**Push**:
- `push_subscriptions` table.
- Client subscribes via service worker on user opt-in (Profile page toggle).
- Edge function `send-push` using `web-push` npm pkg.
- `pg_cron` job daily 08:00 Africa/Accra → calls `send-push` for users with due flashcards or broken streaks.

---

## Technical notes (for reviewers)

- **AI provider**: All Gemini calls keep using `google/gemini-2.5-flash` on Lovable Gateway via the existing `fetch("https://ai.gateway.lovable.dev/v1/chat/completions")` pattern. Claude calls use `anthropic/claude-sonnet-4-5` through the same gateway — same auth, same shape. No new API keys.
- **RLS**: every new table gets `GRANT` to authenticated + service_role, RLS enabled, user-scoped policies + admin override via `has_role()`.
- **Admin bypass**: subscription limit checks gated by `has_role(auth.uid(), 'admin')`.
- **Migrations**: one migration per phase; each new public table follows CREATE → GRANT → ENABLE RLS → POLICY order.
- **Routing**: new sidebar entries for Groups, Marketplace, Leaderboards (Pro-only badge where appropriate).
- **Realistic scope per phase**: each phase = ~one focused build session. After each phase I'll stop and let you test before continuing.

---

## What I need from you before each gated phase

| Phase | Blockers |
|---|---|
| 1 | None — start immediately |
| 2 | YOUTUBE_API_KEY |
| 3 | None |
| 4 | None |
| 5 | VAPID keys (I'll generate them) |

Approve this plan and I'll start Phase 1.
