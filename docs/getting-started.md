# Getting started with LooK

AI-powered product demo video generator - one command, professional results

## Install

```bash
npx look-demo quick https://your-app.com
```

## Verify the install

Clone the repository and run its checks to confirm everything works on your machine:

```bash
git clone https://github.com/nirholas/LooK.git
cd LooK
```

Available commands:

| Command | Runs |
|---|---|
| `npm run start` | `node bin/repovideo.js` |
| `npm run build` | `tsc` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `eslint src/ bin/ --ext .js,.ts` |
| `npm run test` | `vitest run` |

## Next steps

- [Examples](./examples.md) shows runnable snippets.
- The [README](https://github.com/nirholas/LooK#readme) is the complete reference.
- Found a problem? [Open an issue](https://github.com/nirholas/LooK/issues).
