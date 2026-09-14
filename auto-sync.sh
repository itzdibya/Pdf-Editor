#!/usr/bin/env bash
#
# Auto-Sync Workspace to GitHub (Bash Daemon)
# Periodically checks for modified/uncommitted files, commits them, and pushes to GitHub.
# Excludes sitemap.xml and robots.txt from local UAT while keeping them in GitHub repository.

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH="${1:-master}"
CHECK_INTERVAL_SECONDS=15

echo "[Auto-Sync] Starting auto-sync daemon on branch: $BRANCH"

# Enforce UAT exclusions locally
git -C "$REPO_DIR" update-index --skip-worktree sitemap.xml robots.txt 2>/dev/null || true
rm -f "$REPO_DIR/sitemap.xml" "$REPO_DIR/robots.txt"

while true; do
    # Ensure exclusions remain active
    git -C "$REPO_DIR" update-index --skip-worktree sitemap.xml robots.txt 2>/dev/null || true
    rm -f "$REPO_DIR/sitemap.xml" "$REPO_DIR/robots.txt"

    # Check if there are modified, added, or deleted files
    if [[ -n $(git -C "$REPO_DIR" status --porcelain) ]]; then
        echo "[Auto-Sync] Detected changes at $(date)..."
        git -C "$REPO_DIR" add -A
        git -C "$REPO_DIR" reset HEAD -- sitemap.xml robots.txt 2>/dev/null || true
        
        # Commit with timestamp
        TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
        git -C "$REPO_DIR" commit -m "auto-sync: workspace update [$TIMESTAMP]"
        
        echo "[Auto-Sync] Pushing to origin $BRANCH..."
        if git -C "$REPO_DIR" push origin "$BRANCH"; then
            echo "[Auto-Sync] Successfully pushed changes to GitHub."
        else
            echo "[Auto-Sync] Push failed. Check your GitHub authentication / SSH key."
        fi
    fi
    sleep "$CHECK_INTERVAL_SECONDS"
done

