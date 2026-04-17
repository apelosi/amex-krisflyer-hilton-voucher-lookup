## Learned User Preferences

- Never commit directly to `main`; always create a descriptively named branch (e.g. `fix/description` or `feat/description`), push it, and open a PR via `gh pr create` targeting `main`.
- When a rebase conflict arises, prefer keeping the local (modified) version over the remote version unless the user says otherwise.
- When running a staged commit-and-push and the remote is ahead, automatically rebase (`git pull --rebase origin main`) before pushing rather than asking the user.

## Learned Workspace Facts

- Default branch is `main`; the remote is `origin` on GitHub.
- `.env` holds local-only secrets and config — never stage it unless the user explicitly lists it in the files to commit; never override it during a `git reset --hard`.
- `.cursor/hooks/state/continual-learning.json` is a tracked file that is updated frequently; it is safe to commit and push on its own.
- The `web-scraping-and-browser-automation/` folder contains docs and test-result notes; files inside it follow the naming convention `web-scraping-and-browser-automation-<slug>.md`.
- The project is developed in two environments (local machine and a cloud-connected workspace); they can diverge, so always verify remote state with `git fetch` before any reset or rebase.
