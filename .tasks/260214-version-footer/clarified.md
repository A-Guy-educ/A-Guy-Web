# Clarified Questions for 260214-version-footer

## Questions from Spec Agent

1. Where does the version string come from on the admin page (env var, package.json, build metadata), and should the public footer use the exact same source/format?
2. What is the exact format expected (e.g., `v1.2.3`, `1.2.3`, commit hash, build date)?
3. Where in the public footer should it appear (left/right, near copyright, below links, etc.)?
4. Any specific styling constraints (font size, color token, opacity) beyond "small/minimal/subtle," or should it match the admin styling exactly?
5. Confirm whether we should ignore the "Commit and open PR" deliverable for the spec (since I only produce spec.md).

## Answers

1. **Version source:** Use the same source as the admin page. Check how admin page gets the version (likely from package.json or an env var during build).
2. **Format:** Same as admin page - minimal version like "v0.9.0" or just "0.9.0"
3. **Placement:** Right side of footer, aligned with or near the copyright text
4. **Styling:** Small, subtle, not bold. Match admin page styling exactly - use the same component/approach if possible
5. **PR deliverable:** Yes, spec agent only produces spec.md. The pipeline handles PR separately.
