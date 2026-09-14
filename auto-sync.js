/**
 * Auto-Sync Workspace to GitHub
 * 
 * Automatically monitors files in this directory for changes,
 * debounces multiple edits, commits changes, and pushes to GitHub.
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORKSPACE_DIR = __dirname;
const DEBOUNCE_MS = 8000; // Wait 8 seconds after the last file edit before committing
const IGNORED_PATHS = ['.git', 'node_modules', '.tmp', 'scratch', '.env'];

// Toggle to pause/resume auto-sync
const AUTO_SYNC_ENABLED = false;

let syncTimeout = null;
let isSyncing = false;

console.log(`[Auto-Sync] Auto-deploy to GitHub is currently PAUSED.`);

// Check git status and push
function syncToGitHub() {
    if (!AUTO_SYNC_ENABLED) {
        return;
    }

    if (isSyncing) {
        console.log('[Auto-Sync] Sync already in progress, queuing...');
        triggerSync();
        return;
    }

    isSyncing = true;
    console.log('[Auto-Sync] Checking for workspace changes...');

    try {
        // Stage all changes
        execSync('git add -A', { cwd: WORKSPACE_DIR, stdio: 'pipe' });

        // Check if there are staged changes
        const diffStatus = execSync('git status --porcelain', { cwd: WORKSPACE_DIR }).toString().trim();
        if (!diffStatus) {
            console.log('[Auto-Sync] No changes detected to commit.');
            isSyncing = false;
            return;
        }

        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const commitMsg = `auto-sync: update workspace [${timestamp}]`;
        
        console.log(`[Auto-Sync] Committing changes: "${commitMsg}"`);
        execSync(`git commit -m "${commitMsg}"`, { cwd: WORKSPACE_DIR, stdio: 'inherit' });

        // Push to remote repository
        console.log('[Auto-Sync] Pushing to GitHub (origin master)...');
        exec('git push origin master', { cwd: WORKSPACE_DIR }, (error, stdout, stderr) => {
            if (error) {
                console.error(`[Auto-Sync] Push failed: ${stderr || error.message}`);
                console.error('[Auto-Sync] Tip: Ensure GitHub credentials / SSH keys are configured.');
            } else {
                console.log(`[Auto-Sync] Successfully pushed to GitHub!\n${stdout || stderr}`);
            }
            isSyncing = false;
        });

    } catch (err) {
        console.error(`[Auto-Sync] Error during sync: ${err.message}`);
        isSyncing = false;
    }
}

function triggerSync() {
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }
    syncTimeout = setTimeout(() => {
        syncToGitHub();
    }, DEBOUNCE_MS);
}

// Watch directory recursively for file changes
fs.watch(WORKSPACE_DIR, { recursive: true }, (eventType, filename) => {
    if (!filename) return;

    // Ignore .git and temp files
    const shouldIgnore = IGNORED_PATHS.some(ignored => filename.startsWith(ignored) || filename.includes(`/${ignored}/`));
    if (shouldIgnore) return;

    console.log(`[Auto-Sync] Detected ${eventType} in: ${filename}`);
    triggerSync();
});

// Run an initial check on start
triggerSync();
