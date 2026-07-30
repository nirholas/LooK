# LooK Documentation Assets

This folder contains static assets for the MkDocs documentation site:

- `favicon.svg` - Site favicon, wired up in `mkdocs.yml`
- `logo.svg` - Site logo, wired up in `mkdocs.yml`
- Additional images and media files

## Replacing the Favicon or Logo

Overwrite `favicon.svg` or `logo.svg` in this folder. `mkdocs.yml` already points at both:

```yaml
theme:
  logo: assets/logo.svg
  favicon: assets/favicon.svg
```

To use a different filename or format, update those two lines to match.
