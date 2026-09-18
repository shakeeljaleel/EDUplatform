# Strict Vercel Hobby Plan Deployment Rule

For every single change, strictly follow this sequential workflow:
1. Make all code changes in ONE single commit.
2. Run `npm run build` locally to verify clean compilation.
3. Push ONCE to `develop`.
4. Wait for the Vercel Preview deployment to show `Ready`.
5. Merge `develop` into `main` and push ONCE to `main`.
6. NEVER push multiple commits in quick succession. NEVER push to both branches within seconds of each other. One push at a time, wait for Ready status before proceeding.
