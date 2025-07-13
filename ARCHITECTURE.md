# 🛠️ Refined RCA: Svelte `effect_orphan` Failure in Chrome Extension Popup

## Objective
To not only document *what* failed and *how* it was fixed, but to rigorously test *why* the failure occurred, and to institutionalize the lessons learned as preventative engineering practices.

---

## 1. Incident Title
Svelte `effect_orphan` Failure in Chrome Extension Popup

## 2. Timeline
- Bug appeared after dependency upgrades (Vite 7, Svelte-Vite plugin v6)
- Attempted rAF poller, config changes, and dependency downgrades
- Ultimately executed the Phoenix Protocol: rebuilt from the official CRXJS Svelte demo

## 3. Final Root Cause (Narrative)
The `effect_orphan` error resulted from dependency drift. Upgrading to Vite 7 and Svelte-Vite plugin v6 created an incompatibility with CRXJS v2, leading to a race condition in popup script initialization. The issue was resolved by reverting to the stable dependency set from the official CRXJS Svelte demo.

---

## 4. Layered, Hypothesis-Driven Investigation

### Layer 1: The Environment
- **Hypothesis:** Node.js or pnpm version mismatch caused subtle incompatibilities.
- **Test:** Compare `.nvmrc`, `node -v`, `pnpm -v`.
- **Conclusion:** Environment was not the root cause.

### Layer 2: The Foundation (Dependencies)
- **Hypothesis:** The combination of Vite 7, Svelte-Vite plugin v6, and CRXJS v2 is unstable; the demo’s stack is stable.
- **Test:** Diff `package.json` and `pnpm-lock.yaml`. Run `pnpm list > deps.txt` in both projects and diff.
- **Conclusion:** Confirmed—dependency drift to unverified versions was the root cause.

### Layer 3: The Blueprint (Build/Tooling Config)
- **Hypothesis:** Custom `vite.config.ts` or plugin order contributed to the failure.
- **Test:** Diff `vite.config.ts` and other config files. Look for plugin loading order, conditional imports, and build options.
- **Conclusion:** Partially confirmed—config exacerbated the issue but was not the sole cause.

### Layer 4: The Structure (Source Code)
- **Hypothesis:** Application code was not at fault.
- **Test:** Diff `src` directories, especially `App.svelte`.
- **Conclusion:** Confirmed—code was functionally identical; the bug was environmental.

---

## 5. Action / Result Table

| Layer         | File/Aspect         | Broken (`ishka-ext-archive`) | Working (`ishka-ext`) | Impact/Notes                        |
|---------------|--------------------|------------------------------|----------------------|--------------------------------------|
| Environment   | Node version       | v24.1.0                      | v24.5.0              | Environment confirmed stable (.nvmrc)|
| Dependencies  | vite               | 7.x.x                        | 6.2.0                | Incompatibility with CRXJS           |
| Dependencies  | svelte             | 5.x.x                        | 5.28.1               | Stable version                       |
| Dependencies  | @sveltejs/vite...  | 6.x.x                        | 5.0.3                | Plugin version mismatch              |
| Config        | vite.config.ts     | Custom input, plugin order   | Template default     | Demo config is proven to work        |
| Source        | App.svelte         | (same)                       | (same)               | Code not at fault                    |

---

## 6. Preventative Engineering Actions

### Tier 1 (Immediate)
- **Add `.nvmrc` to the repo.**
- **Create `ARCHITECTURE.md` documenting the LTS stack:**
  - Vite: 6.x.x
  - Svelte: 5.x.x
  - @sveltejs/vite-plugin-svelte: 5.x.x
  - @crxjs/vite-plugin: 2.x.x
- **Document the Phoenix Protocol as the recovery process.**

### Tier 2 (Systemic)
- **Establish a "Dependency Upgrade" policy:**
  - Major upgrades only on isolated branches, with full regression testing.
- **Mandate use of official, working templates for all new projects.**

---

## 7. LTS Stack (as of this RCA)

- Node: v24.5.0 (per .nvmrc)
- pnpm: 10.8.0
- Vite: 6.2.0
- Svelte: 5.28.1
- @sveltejs/vite-plugin-svelte: 5.0.3
- @crxjs/vite-plugin: 2.0.0

---

## 8. Appendix: The Phoenix Protocol
1. Archive the old project.
2. Scaffold a new project from the official CRXJS Svelte demo.
3. Copy over only the application logic.
4. Rebuild and verify. 