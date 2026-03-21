# -hp3 Handover

## 1. Repository overview
- Repository: `-hp3`
- Remote: `https://github.com/nmrn0629/-hp3.git`
- Type: Static website (no `package.json`, no build step required)
- Main content files: HTML/CSS/JS and image assets under `images/`

## 2. Current baseline (as of 2026-03-21)
- Branch: `main` (tracking `origin/main`)
- Working tree: clean
- Local backup created during cleanup:
  - `C:\Users\ah266\OneDrive\ドキュメント\Playground\-hp3_cleanup_backup_20260321_195117`
  - Contains:
    - `-hp3-main 3.21.zip`
    - `パソコン背景原画 (2).png`

## 3. Key operational file
- `js/topics-data.js`
  - Topic data source shared across pages.
  - Topic updates should be done here to keep pages consistent.

## 4. Day-to-day workflow
1. Open terminal in repo root.
2. Pull latest changes before starting:
   - `git pull`
3. Edit files.
4. Check changes:
   - `git status`
5. Commit and push:
   - `git add -A`
   - `git commit -m "Describe the update"`
   - `git push`

## 5. Multi-admin notes
- If push fails or conflicts happen, sync first with `git pull` and then retry.
- `docs/README-ADMIN.md` contains the operations guide for multi-person updates.
- `auto-push-topics.ps1` exists for topic update automation workflows.

## 6. Suggested first task for Codex
- Validate all image references in HTML/CSS and remove unused large assets after confirmation.

