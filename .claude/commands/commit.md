---
name: commit
description: Stage and commit changes with a conventional commit message — reviews diff, proposes message, waits for approval
---

Review the current git changes and create a commit.

1. Run `git status` and `git diff` (both staged and unstaged) to understand what changed
2. Draft a commit message following conventional commits:
   - `feat:` new feature
   - `fix:` bug fix  
   - `chore:` setup, config, tooling
   - `refactor:` restructuring without behaviour change
   - Subject line under 72 characters, keep it simple
   - No Co-Authored-By lines
3. Show me the proposed commit message and wait for my approval
4. On approval, stage relevant files and commit

If $ARGUMENTS is provided, use it as a hint for the commit message subject.