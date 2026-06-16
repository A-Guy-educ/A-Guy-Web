Resolved 8 merge conflicts in `.kody/` infrastructure duty/executable files. All conflicts were asymmetric — the PR branch deleted these files while `origin/dev` updated them with improved content. Took THEIRS (origin/dev) in every case since the PR's deletion had no security or correctness justification, and the dev versions are the live running infrastructure.

Key changes from dev preserved:
- preview-health: simplified policy prose (dropped Python script tick, kept shell script approach)
- task-leader: expanded allowed-commands list, `releasePromotionTitlePrefix` knob added to profile.json, Lane C (release promotion) added to SKILL.md
- vercel-production-deploy: simplified profile (removed `runner`/`reviewer` fields)
- prompt.md: extended knob list in step 1 to include `releaseAutoMergeBranchPrefix`, `releasePromotionTitlePrefix`, `releaseAutoMergeAllowedPaths`
