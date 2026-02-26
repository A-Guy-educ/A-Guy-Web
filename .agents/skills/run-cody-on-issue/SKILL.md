# Skill: run-cody-on-issue

# Run Cody on GitHub Issue

Use this skill when you want to run Cody on a GitHub issue.

## How to Trigger Cody

Comment on the GitHub issue with:

```
@cody [mode]
```

## Modes

| Mode           | Stages                          | Use When                        |
| -------------- | ------------------------------- | ------------------------------- |
| `@cody spec`   | taskify → spec → gap            | Just want specification         |
| `@cody impl`   | architect → build → commit → pr | Already have spec               |
| `@cody full`   | spec + impl                     | Full implementation             |
| `@cody rerun`  | Resume from failure             | Pipeline failed, fix and resume |
| `@cody status` | -                               | Check current status            |

## Examples

### Full Implementation

```
On issue #42, comment:
@cody full
```

### Just Specification

```
@cody spec
```

### Resume After Fix

```
@cody rerun
```

## What Happens

1. Cody reads the issue
2. Generates task.json from issue body
3. Runs pipeline stages
4. Creates PR when complete

## Options

You can add options after the mode:

```
@cody full --profile lightweight
```

| Option      | Values                | Default  |
| ----------- | --------------------- | -------- |
| `--profile` | standard, lightweight | standard |

- **standard**: Full pipeline with gap analysis, auditor
- **lightweight**: Skip gap, plan-gap, auditor

---

**Base directory**: `file:///Users/aguy/projects/A-Guy-2/.agents/skills/run-cody-on-issue`
