# Rancana source audit — 23 October 2026

Read-only inspection of local app repositories. No app, repository, Git ref, account, browser or desktop changes. This report is the only intended deliverable. Findings describe source wiring, not a fresh runtime visual test.

## Baselines and preservation

| Local path under `/Users/macbook/Documents/Codex/` | HEAD | Branch / status |
| --- | --- | --- |
| `2026-10-02/task/Rancana` | `4cce0f81f220fedd66c80b9dae2d884a9be2e504` | `fix/activation-reliability`; clean |
| `2026-10-22/task/ran-94` | `116abd0198caec002356fe5e4c12ff4881e829e4` | `audit/ran-94-subject-context`; clean |
| `2026-10-22/task-2/Rancana` | `307661b65b98541764c6656c0db547eca078a5ce` | `audit/ran37-success`; clean |
| `2026-10-22/task-3/ran83-fix` | `1b0dc463b32eaa36e95faed1396838e82707bc34` | `fix/ran83-consent-race`; existing user changes listed below |

The Oct22 copies contain different local audit/fix branches; their commit dates do not establish one authoritative production checkout. `ran-94` was used for the line references below. It is based on `cedbd2b10a6ca6db6affd742cb9dd648d278aa5c` (22 October 2026 00:21:56 +0700; version bump `1.0.3+78`) with a Home subject-scope fix. The Oct2 checkout only exposes its old local branch. Its origin is `https://github.com/andikaprp/Rancana.git`; `ran-94` origin is the Oct2 local checkout, and `ran83-fix` origin is `ran-94`. The task-2 repository has no remote. No fetch or network ref verification was performed.

Existing `ran83-fix` status, preserved:

```text
 D assets/images/study_mode/painted_wash_original.png
 D assets/mascots/member-card-back.png
?? docs/DEFAULT_ON_ANALYTICS_PROPOSAL.md
?? lib/shared/observability/default_on_analytics_proposal.dart
?? test/shared/observability/default_on_analytics_proposal_test.dart
```

The `2026-10-22/task-2/source-snapshot`, `task-3/cedbd2b-source`, and `task-4/rancana-v79` directories contain source but are not Git repositories. Their names are not proof of commit identity. Repository AGENTS.md files were read before inspection; they require preserving local-first architecture, small changes, and validation appropriate to app changes. No app changes were made.

## Verified source findings

All relative references below resolve against `/Users/macbook/Documents/Codex/2026-10-22/task/ran-94`.

- **Active Aurora Green is `#217957`, Love Pink is `#FF197D`.** `lib/app/app_color_theme.dart:194` defines Love Pink (c500 at line 200; dark c500 at 212); Aurora starts at 220 (c500 at 226; dark c500 at 238). `lib/core/app.dart:226` binds ThemeBloc's mode; lines 227–247 construct the light ThemeData directly from the selected palette, including its primary and ColorScheme seed. These values should be preserved as the source baseline, irrespective of historical proposed foundation tokens.
- **Color themes and brightness are separate concerns.** `lib/shared/extensions/app_theme_extensions.dart:7` selects a palette using preview scope or ThemeBloc and falls back to Aurora; it does not select a dark ramp based on brightness. `theme_state.dart:8` defaults to light/Aurora. ThemeBloc supports saved light/dark/default mode (`theme_bloc.dart:112`, `:139`).
- **Dark mode is partial.** `lib/core/app.dart:248` builds a dark ColorScheme, but still sets `scaffoldBackgroundColor: AppColors.background`, `surface: Colors.white`, and `onSurface: voidTheme.c1000Light` (249, 264–265). Aurora and Love Pink dark ramps duplicate light ramps (`app_color_theme.dart:194–244`). Card helpers explicitly use light palette values or white (`:60–68`); page gradients also use light values (`:78–127`). This is source-level evidence, not a claim that every screen was visually tested.
- **Lora and SourceSansPro are bundled and referenced.** `pubspec.yaml:190–209` declares both families and Regular/Medium/SemiBold/Bold assets; `lib/app/app_text_styles.dart:5–6` defines the family names. Headers 1–5 are Lora 600 at nominal sizes 32/28/26/22/18 (`app_text_styles.dart:17–49`); captions are Lora 500 at 16/14/12 (`:52–70`); body styles are SourceSansPro 600 or 400 at 16/14/12 (`:73–113`). These AppDimens values use ScreenUtil `.sp` (`app_dimens.dart:15–28`), so they are not fixed physical pixels.
- **Additional themes exist.** `app_color_theme.dart:3` lists Aurora, Love, Semester Indigo, Void Monochrome, and four Vision variants, plus semantic success/danger/warning/neutral. Semester c500 is `#6D5CE8` (`:436`); Vision Protan `#005A9C` (`:461`), Deutan `#6235A8` (`:486`), Tritan `#A61B5B` (`:511`), Monochrome `#3A3A3A` (`:537`). Semester selection is entitlement-gated in `theme_bloc.dart:56–92`. Do not equate these theme options with subject categories.

## Legacy AppColors.primary references

`AppColors.primary` is legacy blue `#08307D` (`lib/app/app_colors.dart:13`), with secondary `#6F88BF` (`:16`). `primary2` is `0x004C8514`, fully transparent ARGB (`:14`), not an opaque green. Search of `lib/` found the following uncommented references. These are source consumers, not proof that each widget is reachable in the current router:

- `lib/app/app_theme.dart:8`, `:10`, `:20`, `:22`: legacy theme class. Its `dartTheme` getter also declares `Brightness.light`; active `core/app.dart` constructs ThemeData directly instead.
- `lib/shared/presentation/widgets/circle_icon_text_button.dart:32`, `:39`
- `lib/shared/presentation/widgets/dropdown/dialog_dropdown_widget.dart:77`, `:129`
- `lib/shared/presentation/widgets/stepper.dart:24`
- `lib/shared/presentation/widgets/no_data_widget.dart:44`, `:55`
- `lib/shared/presentation/widgets/scaffold_with_nested_navigation.dart:71`, `:91`

Two further hits are commented out: `dropdown/opsi_dropdown_field_widget.dart:238` and `dropdown/opsi_dropdown_button_widget.dart:196`. A future migration should assess actual callers rather than replacing all text hits indiscriminately.

## Subject palette and historical proposal

`lib/shared/presentation/subject_color_palette.dart:4–12` defines sage `#E4ECDE`, sky `#DDEEF5`, sand `#F5E9D4`, lilac `#ECE6F5`, rose `#F5E4E8`, and fallback/slate `#E7EBEE`. Monochrome forces slate for all keys. There is no separate dark subject palette. Labels are localized at lines 16–24. Current consumers are `features/subject/presentation/widgets/subject_color_picker.dart:68` and `features/schedule/presentation/widgets/quiet_week_schedule_grid.dart:97`. `shared/local/subject_colors/subject_color_store.dart:7–21` defines the persisted key, six supported palette keys, and deterministic subject-ID default assignment; lines 85–92 persist chosen keys. Preserve these categorical identities separately from semantic success/warning/error colors.

The uploaded `/Users/macbook/Downloads/FOUNDATION.md` is consistent with these observed app font and palette values. Its proposed `color-bg: #F9F9F9` is a palette literal assigned to a new semantic role; the current runtime scaffold is actually `AppColors.background = #F3F8FC` (`app_colors.dart:8`, `core/app.dart:228,249`). Its dark semantic assignments, SourceSansPro caption recipe, and unscaled size migration remain proposals; they must not be reported as already implemented. Its own lines 203–205, 271–277 and 291 explicitly distinguish proposals and draft token artifacts from active behavior. Historical source paths under `/home/hatch/workspace/dev/` do not establish the present checkout's identity.

## Cross-copy check and limits

SHA-256 comparison found byte-identical `app_color_theme.dart`, `app_text_styles.dart`, `app_colors.dart`, and `subject_color_palette.dart` in `ran-94`, task-2/Rancana, task-3/ran83-fix, and task-6/rancana-80-isolated/source-frozen. Thus these specific token findings are stable across the inspected Oct22 copies despite different feature branches. No general claim of whole-app equivalence follows.

Execution initially stalled with login-shell reads; rerunning reads with `login:false` succeeded and completed the missing checks. No approval denial occurred. Latest remote app refs were not checked because this delegated pass was filesystem-only; a current authoritative app baseline still needs remote/ref reconciliation before implementation. No builds, runtime screenshots, tests, pushes, merges, deploys, account edits, or Play Console actions were attempted.

## Follow-up remote verification by implementation owner

GitHub read-only verification on 2026-10-23 found app `main` at `99b750325ba6ebf5bfba0deed22c1cf64ac1ae2f` and app `staging` at `4e0cb2da9aed51db2c8fbf080ca91a7a5af3877c`. Six inspected local files have exactly the same Git blob SHA as remote staging:

| File | Git blob SHA |
|---|---|
| lib/app/app_color_theme.dart | 0d901d16df77ed0379e6807080645ed55f5ea8aa |
| lib/app/app_text_styles.dart | 6da18af5a772b2a5888bc13cf2526eaa40fd1fb6 |
| lib/app/app_colors.dart | c31eab3a8027fc868c6aff6adb079f4f5301e193 |
| lib/shared/presentation/subject_color_palette.dart | c2f742c22fedc21be43b45c9a4551fd099d08286 |
| lib/core/app.dart | 96c0dafb7ac5534caf07c2c8dc3e2abbdea9a427 |
| lib/shared/global_features/theme/presentation/bloc/theme/theme_state.dart | 67791634eabc5456f2b470c1869b03ccbbde7843 |

This strengthens the specific foundation/runtime evidence; it does not assert that the entire local branch equals staging or authorize app changes.

## Shared-token integration map (proposal, not Dart implementation)

`tokens.json` is the review ledger for all 61 names, including data-only dark proposals. The mapping below is intended for both Muse and ChatGPT. No generated Dart class or ThemeData is installed.

| Shared reference | Existing Flutter counterpart / adoption boundary |
|---|---|
| brand-green / brand-pink | Aurora / Love c500; keep immutable identity separate from selected theme roles. |
| color-primary / primary-hover / primary-container | Proposed Aurora c500 / c600 / c100 web roles; do not override selected palettes in Flutter. |
| on-primary / on-primary-container | White / Aurora c900 in current light runtime; component and theme acceptance still required. |
| color-bg | Proposal void c50 #F9F9F9, **not** current scaffold AppColors.background #F3F8FC. |
| surface / text / muted / border | Palette literal reuse; each new role needs real component review. |
| accent / on-accent | Love c500 / void c1000 proposal; do not swap primary globally. |
| success / warning / error / info | Proposed foreground roles, not fill/on-fill pairs, selectable palettes, or subject classes. |
| focus | Proposed role; CSS 3px outline with 4px gap is a web reference treatment, not Flutter focus geometry. |
| subject-* | Six exact categorical tints; preserve persisted keys, localization and monochrome override. |
| font-heading / font-body | Lora / SourceSansPro registered Flutter families; CSS uses spaced Source Sans Pro name. |
| weight-* | Existing w400/w500/w600; do not request missing web font weights. |
| text-h1…h5 | Nominal 32/28/26/22/18 from existing AppTextStyles; keep .sp behavior and accessibility text scaling until explicitly reviewed. |
| text-body / small / caption | Nominal 16/14/12; app captions remain Lora 500. SSP 400 caption recipe is a proposed web role. |
| text-display | Web marketing reference only; app can omit it. |
| leading-heading / body | Proposed recipes from web ratios; Flutter currently does not set these universally. |
| space-* | Selected nominal AppDimens magnitudes; CSS px are not identical to scaled .sp geometry. |
| radius-* | Proposed shared geometry, not an existing Flutter radius system. Pill could map to StadiumBorder after review. |
| shadow-raised | CSS translation of AppShadows.shadow (0,4), blur18, black .08; not Material elevation. |
| elevation-flat / raised | New proposed Material 0/2 dp, unused by web recipes. Never stack automatically with the shadow. |
| all darkProposal values | Unimplemented new role assignments, even when literals exist. No dark UI acceptance implied. |

App visual acceptance requires actual Flutter captures, text-scaling checks and selected/vision theme review. None were requested or performed for this web-only slice.
