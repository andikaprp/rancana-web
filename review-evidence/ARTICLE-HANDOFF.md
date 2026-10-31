# Article example assets

Updated 2026-10-31 (RAN-62). First checked 2026-10-18.

## Current state

The To-do, Jadwal (class schedule) and Flashcard guides now use real app screenshots. They are real app screens rendered from the app source (app repository `staging`, commit 3e0c55b, 31 Oct 2026) with sample data, not phone captures and not illustrations.

- `assets/screenshots/todo-screen.webp`: the To-do tab with the Semua/Aktif/Terlewat/Selesai filters and a task list. Used in the "Kelola tugas setelah dibuat" / "Manage tasks after adding them" section.
- `assets/screenshots/jadwal-screen.webp`: the Jadwal tab in the Mingguan (weekly) view. Used in the "Cek dan ubah jadwal" / "Review and update your schedule" section.
- `assets/screenshots/flashcard-screen.webp`: the Flashcard deck list. It replaces `assets/phone-center.webp` in the existing flashcard figure, and the caption is unchanged.
- Each has a 400 px `-400.webp` variant for `srcset`. The cropped PNG sources are in `assets/screenshots/source/`, which `.assetsignore` excludes from deployment.
- The hero app icons (`guide-hero-prop`) were removed from these three guides. The mascot stays.
- Crops: the top ~40 px (header background strip) on all three. On To-do and Jadwal, the bottom strip with the home flashcard "peek" drawer was also cut. On Flashcard, the empty bottom gradient was trimmed.

## Unchanged

- The text examples in the To-do and Jadwal guides keep their "Contoh data · bukan tangkapan layar aplikasi" / "Sample data · not an app screenshot" labels, because those boxes are still sample text.
- The app shows the Indonesian UI in both language versions.
