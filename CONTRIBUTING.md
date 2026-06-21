# Contributing to Zeta

Thank you for your interest in contributing! This guide will help you get started.

## Code of Conduct

Be respectful, constructive, and inclusive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

## How to Contribute

### Reporting Bugs

1. Search [existing issues](https://github.com/your-org/zeta/issues) to avoid duplicates
2. Open a new issue with:
   - Clear title describing the bug
   - Steps to reproduce
   - Expected vs actual behaviour
   - Screenshots if applicable
   - Your environment (OS, Node version, browser)

### Suggesting Features

Open a [GitHub Discussion](https://github.com/your-org/zeta/discussions) or feature-request issue. Describe:
- The problem you are solving
- Your proposed solution
- Alternatives you considered

### Submitting a Pull Request

1. Fork and clone the repository
   ```bash
   git clone https://github.com/your-org/zeta.git
   cd zeta
   ```
2. Create a feature branch off `main`
   ```bash
   git checkout -b feat/your-feature
   # or
   git checkout -b fix/your-bugfix
   ```
3. Install dependencies
   ```bash
   npm install
   ```
4. Make your changes, keeping each commit focused
5. Run quality checks
   ```bash
   npm run lint
   npx tsc --noEmit
   ```
6. Push your branch and open a PR against `main`

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org):

```
<type>: <short summary>

[optional body]
```

Types: `feat` · `fix` · `docs` · `style` · `refactor` · `security` · `chore`

Examples:
```
feat: add message reactions to chat
fix: correct highlight animation on deep-linked messages
docs: update environment variable table in README
security: add CRON_SECRET guard to email endpoint
```

## Code Style

- **TypeScript strict mode** — no `any` unless absolutely unavoidable
- **Tailwind CSS v4** for all styling — no inline styles
- **Server Actions** for all data mutations — no client-side fetch to internal endpoints
- **Prisma** for all database access — no raw SQL
- Keep components small and focused — one responsibility per file
- Add a comment for non-obvious logic

## Security Issues

**Do not open public issues for security vulnerabilities.**

Please use [GitHub private security advisories](https://github.com/your-org/zeta/security/advisories/new) or email **security@your-domain.com**.

## Getting Help

- [GitHub Discussions](https://github.com/your-org/zeta/discussions) — questions and ideas
- [Issues](https://github.com/your-org/zeta/issues) — bugs and feature requests
