# Moving City Builder into its own repository

This game currently lives in the `city-builder/` subdirectory of the
`fl-research-package` repo only because the Claude GitHub App on this account
doesn't have permission to create new repositories. Everything here is
self-contained and ready to become its own repo. Two ways to do it.

## Why it isn't already standalone
Creating a repo needs the GitHub App's **Administration: write** permission,
which isn't granted here. Grant it (or just create the empty repo yourself in
the GitHub UI) and either path below takes about a minute.

## Option A — plain copy (simplest)
```bash
# 1. Create an empty repo named "city-builder" on GitHub (no README/gitignore).
# 2. From this project folder:
cd city-builder
rm -rf node_modules dist
git init
git add .
git commit -m "City Builder v0.2 — Phases 0–2"
git branch -M main
git remote add origin https://github.com/hankstiffany-cyber/city-builder.git
git push -u origin main
```
The deploy workflow is already at `.github/workflows/deploy.yml` (repo root in
the new repo), so Actions picks it up automatically.

## Option B — keep history with git subtree
Run from the root of the `fl-research-package` checkout, on the branch that has
this work:
```bash
git subtree split --prefix=city-builder -b city-builder-only
# then push that branch to the new empty repo's main:
git push https://github.com/hankstiffany-cyber/city-builder.git city-builder-only:main
```

## After migrating
1. **Settings → Pages → Source → GitHub Actions** (one-time).
2. Push to `main`; the workflow builds and publishes. Your URL will be
   `https://hankstiffany-cyber.github.io/city-builder/`.
3. On iPhone: open that URL in Safari → Share → **Add to Home Screen**.

Nothing in the code references the `fl-research-package` repo or the
subdirectory path (Vite uses a relative base), so no code changes are needed.
