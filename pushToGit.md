# How to Push to Git

## Quick Push (most common)

```bash
git add <file1> <file2>
git commit -m "your message here"
git push
```

## Step-by-Step Breakdown

### 1. Check what changed

```bash
git status
```

Shows modified, deleted, and untracked files.

### 2. See the actual changes

```bash
git diff
```

### 3. Stage files you want to commit

**Specific files (recommended):**

```bash
git add src/App.jsx src/AdminPanel.jsx
```

**All changed files:**

```bash
git add -A
```

### 4. Commit with a message

```bash
git commit -m "short description of what changed"
```

### 5. Push to GitHub

```bash
git push
```

If the branch has no upstream yet:

```bash
git push -u origin main
```

## Common Issues

### "rejected - non-fast-forward"

Someone else pushed changes. Pull first:

```bash
git pull --rebase
git push
```

### "fatal: not a git repository"

You are in the wrong folder. Navigate to your project:

```bash
cd "C:\Users\SURFACE\Downloads\EWP Quote App"
```

### "Permission denied"

Make sure you are logged into GitHub CLI:

```bash
gh auth login
```

Or check your remote URL:

```bash
git remote -v
```

### Undo last commit (before pushing)

```bash
git reset --soft HEAD~1
```

Your files stay changed, just uncommitted.

## For Claude Code Chats

When asking Claude to push, say something like:

- "commit and push these changes"
- "push it"
- "commit with message X and push"

Claude will run `git add`, `git commit`, and `git push` for you.
