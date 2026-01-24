# LooK Documentation Assets

This folder contains static assets for the MkDocs documentation site:

- `favicon.png` - Site favicon (add your own 32x32 or 64x64 PNG)
- `logo.png` - Site logo (optional)
- Additional images and media files

## Adding a Favicon

Create a PNG image (recommended 32x32 or 64x64 pixels) and save it as `favicon.png` in this folder.

## Adding a Logo

For a custom logo in the header, create `logo.png` and update `mkdocs.yml`:

```yaml
theme:
  icon:
    logo: assets/logo.png
```
