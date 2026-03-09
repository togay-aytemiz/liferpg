# AI Agent Guidelines — lifeRPG

> **Purpose:** Instructions for AI coding assistants working on this project.

---

## 🎯 Project Overview

This is the **lifeRPG** project.
- A system for tracking tasks, habits, and personal development in a gamified (RPG) format.
- Built to improve productivity through engaging, game-like mechanics.

---

## 📚 Key Documents

| Document | Path | Purpose |
|----------|------|---------|
| PRD | `docs/PRD.md` | Product requirements & feature specs |
| Roadmap | `docs/ROADMAP.md` | Development phases with checkboxes |
| Release Notes | `docs/RELEASE.md` | Track completed work per iteration |
| This File | `AGENTS.md` | AI agent workflow instructions |

---

## ⚠️ Critical Workflow Rules

### After Completing Tasks

**You MUST update these documents after completing work:**

1. **`docs/ROADMAP.md`**
   - Mark completed items with `[x]`
   - Add new items if scope expanded
   - Update "Last Updated" date

2. **`docs/PRD.md`**
   - Update if requirements changed
   - Add decisions to "Tech Decisions" appendix
   - Update "Last Updated" date

3. **`docs/RELEASE.md`**
   - Add completed features under `[Unreleased]` → `Added`
   - Note any changes under `Changed`
   - Document bug fixes under `Fixed`

4. **Commit messages**
   - Reference the roadmap phase: `feat(phase-3): implement habit tracking`
   - **Always provide a commit message in every response** (even if no commit is requested)

5. **Build Verification**
   - Run relevant build and test scripts to ensure no regressions or type errors before completing the task.

---

## 🛠️ Development Principles

### Code Style
- **DRY** — Don't Repeat Yourself
- **YAGNI** — You Aren't Gonna Need It
- **TDD** — Write tests first when possible

### Architecture
- Maintain clean hierarchy and modular structures.
- Use component-driven design for UI elements.

---

## 📋 Skills to Use

Before starting work, check these skills:

| Skill | When to Use |
|-------|-------------|
| `@brainstorming` | Before any new feature, creative work, or design decision |
| `@writing-plans` | Before touching the code for multi-step tasks |
| `@frontend-design` | When building web components, pages, or styling UI |
| `@design-md` | For analyzing and extracting semantic design systems |
| `@brand-identity`| When generating UI components or writing copy for brand consistency |
| `@troubleshooting` | When debugging, handling errors, or improving application reliability |
| `@prioritizing-tasks` | When scheduling work and organizing tasks |

---

## 🔄 Typical Workflow

```text
1. Read docs/PRD.md to understand requirements
2. Check docs/ROADMAP.md for current phase
3. Use @brainstorming for new features
4. Use @writing-plans for implementation
5. Implement feature / Fix bug
6. Update docs/ROADMAP.md (mark [x])
7. Update docs/PRD.md if specs changed
8. Commit with meaningful messages
```

---

## 📝 Commit Convention

```text
feat(phase-N): description    # New feature
fix(phase-N): description     # Bug fix
docs: description             # Documentation only
refactor: description         # Code restructure
style: description            # UI/CSS/Styling changes
test: description             # Adding tests
```
