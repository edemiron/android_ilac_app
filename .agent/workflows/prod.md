---
description: Production mode. Creates fully production-ready code with all standards applied.
---

# /prod - Production Ready Mode

$ARGUMENTS

---

## Purpose

This command activates PROD mode for fully production-ready implementation with all quality standards.

---

## Behavior

When `/prod` is triggered, apply ALL standards:

### 1. Complete State Coverage
- [ ] Loading state
- [ ] Empty state
- [ ] Error state
- [ ] Success state
- [ ] Disabled state
- [ ] Permission denied state

### 2. Accessibility (WCAG AA+)
- [ ] Keyboard navigation
- [ ] Focus management
- [ ] ARIA labels
- [ ] Color contrast
- [ ] Screen reader tested
- [ ] `prefers-reduced-motion` respected

### 3. Performance
- [ ] No unnecessary re-renders
- [ ] Memoization where measured
- [ ] Code splitting if needed
- [ ] Bundle size considered

### 4. Edge Cases
- [ ] Empty data
- [ ] Large data sets
- [ ] Network failure
- [ ] Invalid input
- [ ] Concurrent operations

### 5. Code Quality
- [ ] TypeScript strict
- [ ] No `any` types
- [ ] Meaningful names
- [ ] Small functions
- [ ] Single responsibility

### 6. i18n Ready
- [ ] No hardcoded strings
- [ ] RTL considered
- [ ] Date/number formats

---

## Output Format

```markdown
## PROD: [Feature Name]

### Quality Checklist
- [x] All states covered
- [x] A11y compliant
- [x] Performance optimized
- [x] Edge cases handled
- [x] Type safe
- [x] i18n ready

### States Implemented
| State | Handled | Notes |
|-------|---------|-------|
| Loading | Yes | Skeleton UI |
| Empty | Yes | CTA included |
| Error | Yes | Retry option |
| Success | Yes | Core flow |

### Accessibility
- Keyboard: [flow description]
- ARIA: [labels used]
- Focus: [management approach]

### Code
```[language]
// Production-ready, complete implementation
```

### Tests Recommended
```[test-language]
// Key test cases
```
```

---

## Examples

```
/prod user authentication
/prod medicine reminder card
/prod settings page
/prod data export feature
```

---

## Key Principles

- **No shortcuts** - Every standard applied
- **Ship with confidence** - Production tested
- **Complete coverage** - All states, all cases
- **Maintainable** - Future team can understand
