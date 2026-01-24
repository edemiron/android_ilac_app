---
description: MVP mode. Creates minimum viable implementation with core functionality only.
---

# /mvp - Minimum Viable Product Mode

$ARGUMENTS

---

## Purpose

This command activates MVP mode for rapid prototyping. Focus on working functionality, polish later.

---

## Behavior

When `/mvp` is triggered:

1. **Core function first** - Must work, must be usable
2. **Minimal states**:
   - Success state (required)
   - Error state (required)
   - Loading state (optional, add if simple)
   - Empty state (defer)

3. **Basic styling**:
   - Layout works
   - Readable
   - No polish yet

4. **Skip for later**:
   - Edge cases
   - Animations
   - i18n details
   - A11y refinements
   - Performance optimization

---

## Output Format

```markdown
## MVP: [Feature Name]

### Core Functionality
[What this MVP does]

### Included
- [x] Core feature works
- [x] Success state
- [x] Basic error handling
- [x] Minimal UI

### Deferred (Next iteration)
- [ ] Loading states
- [ ] Empty states
- [ ] Edge cases
- [ ] Polish/animations
- [ ] A11y refinements

### Code
```[language]
// Working MVP code
```

### Next Steps
1. Test core flow
2. Add loading/empty states
3. Polish UI
4. Add edge cases
```

---

## Examples

```
/mvp login screen
/mvp user dashboard
/mvp medicine list
/mvp notification settings
```

---

## Key Principles

- **Working > Perfect** - Ship something that works
- **Iterate fast** - Build on top, don't rewrite
- **Core path only** - Happy path first
- **Document gaps** - Note what's deferred
