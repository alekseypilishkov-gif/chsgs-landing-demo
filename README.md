# CHSGS landing demo

Vite, TypeScript and Three.js landing page with the production PC03 model.

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Local development uses `/`. To check the production build:

```sh
npm run build
npm run preview
```

Open the preview at `/chsgs_landing/`.

## Deployment

The `Deploy CHSGS demo to GitHub Pages` workflow builds pushes to `master`
and publishes `dist` through the official GitHub Pages Actions. It can also
be started with `workflow_dispatch`. Repository Pages must use GitHub Actions
as its publishing source. The deployed URL is reported by the `github-pages`
environment after a successful deployment.

For demo updates, commit changes and push `master`; deployment runs automatically.
Do not commit `dist` or upload it manually.

Runtime public assets use `import.meta.env.BASE_URL`. Vite manages HTML assets
and the bundled Montserrat fonts.

The production model is `public/models/CHSGS_Plan_WebGL_PC03.glb` (22,864,088 bytes).
SHA-256: `FDC26893A2BB1B36EFEB3643FD1F515151F1BA466344D3ABA92F11734614E8B1`.
CI verifies that the build artifact contains that exact model. Git LFS is not used.
