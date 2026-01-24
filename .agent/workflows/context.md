---
description: Context summary. Provides quick project overview and current development status.
---

# /context - Project Context Summary

$ARGUMENTS

---

## Purpose

This command provides a quick summary of project state, stack decisions, and current development focus.

---

## Behavior

When `/context` is triggered:

1. **Scan project structure** - Identify stack, patterns, architecture
2. **Summarize decisions** - Key technical choices made
3. **List completed features** - What's already built
4. **Identify current focus** - Active development area
5. **Outline next steps** - Upcoming tasks

---

## Output Format

```markdown
## PROJECT CONTEXT

### Project
- **Name**: [project name]
- **Type**: [web app / mobile app / API / etc]
- **Stage**: [MVP / Beta / Production]

### Stack
- **Frontend**: [framework + UI library]
- **Backend**: [framework + DB]
- **Infrastructure**: [hosting + CI/CD]

### Architecture Decisions
1. [Key decision 1]
2. [Key decision 2]
3. [Key decision 3]

### Completed Features
- [x] [Feature 1]
- [x] [Feature 2]
- [x] [Feature 3]

### Current Focus
[What we're working on now]

### Next Steps
1. [ ] [Next task 1]
2. [ ] [Next task 2]
3. [ ] [Next task 3]

### Notes
[Any important context for continuation]
```

---

## Auto-Detection

The context command will auto-detect:

| Check | Files |
|-------|-------|
| React/RN | `package.json`, `.tsx` files |
| Vue | `package.json`, `.vue` files |
| .NET | `.csproj`, `Program.cs` |
| Node | `package.json`, `server.js` |
| Python | `requirements.txt`, `main.py` |
| Database | `schema.prisma`, migrations |

---

## Examples

```
/context
/context detailed
/context for new developer
```

---

## Key Principles

- **Concise** - 5-10 bullet points max
- **Actionable** - Clear next steps
- **Current** - Reflect actual state
- **Useful** - Help resume work fast
