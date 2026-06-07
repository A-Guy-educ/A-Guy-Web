Resolved merge conflict in `.kody/last-run.jsonl` by taking the origin/dev version.

The conflicted file is an operational log (JSONL session trace), not source code. Both sides were different session runs with no meaningful merge semantics — origin/dev's version was taken as it represents the more recent codebase state.

No source code files were touched. All conflicts are resolved; merge commit is ready to complete.
