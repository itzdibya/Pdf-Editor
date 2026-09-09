#!/usr/bin/env bash
#
# Auto-Sync Workspace to GitHub (Bash Daemon)
# Periodically checks for modified/uncommitted files, commits them, and pushes to GitHub.

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH="${1:-master}"
CHECK_INTERVAL_SECONDS=15

echo "[Auto-Sync] Monitoring repository at $REPO_DIR (branch: $BRANCH) every $CHECK_INTERVAL_SECONDS seconds..."

cd "$REPO_DIR" || exit 1

while true; do
    # Check if there are modified, added, or deleted files
    if [[ -n $(git status --porcelain) ]]; then
        echo "[Auto-Sync] Detected changes at $(date)..."
        git add -A
        
        # Commit with timestamp
        TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
        git commit -m "auto-sync: workspace update [$TIMESTAMP]"
        
        echo "[Auto-Sync] Pushing to origin $BRANCH..."
        if git push origin "$BRANCH"; then
            echo "[Auto-Sync] Successfully pushed changes to GitHub."
        else
            echo "[Auto-Sync] Push failed. Check your GitHub authentication / SSH key."
        fi
    fi
    sleep "$CHECK_INTERVAL_SECONDS"
done
