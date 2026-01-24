# User Guide

This section covers everything you need to know to create professional demo videos with LooK.

## Guides

<div class="grid cards" markdown>

-   :material-application:{ .lg .middle } __Web Editor__

    ---

    Use the visual editor to create, edit, and export demos with a modern interface.

    [:octicons-arrow-right-24: Web Editor](web-editor.md)

-   :material-record-rec:{ .lg .middle } __Live Recording__

    ---

    Record demos in real-time with preview and manual control.

    [:octicons-arrow-right-24: Live Recording](live-recording.md)

-   :material-file-document-multiple:{ .lg .middle } __Templates__

    ---

    Use pre-built templates for common demo scenarios.

    [:octicons-arrow-right-24: Templates](templates.md)

-   :material-palette:{ .lg .middle } __Customization__

    ---

    Customize cursors, click effects, zoom, and more.

    [:octicons-arrow-right-24: Customization](customization.md)

-   :material-format-paint:{ .lg .middle } __Theme Presets__

    ---

    Apply pre-built themes for consistent styling.

    [:octicons-arrow-right-24: Theme Presets](theme-presets.md)

-   :material-cellphone:{ .lg .middle } __Mobile Recording__

    ---

    Record iOS and Android app demos.

    [:octicons-arrow-right-24: Mobile Setup](mobile-setup.md)

</div>

## Quick Comparison

| Method | Best For | Control Level |
|--------|----------|---------------|
| `look quick` | Fast demos | Automatic |
| `look demo` | Customized demos | CLI options |
| Web Editor | Visual editing | Full control |
| Live Recording | Interactive demos | Manual control |
| Mobile | App demos | Automated + Manual |

## Recommended Workflow

### For Most Users

1. Start with `look quick <url>` to see results immediately
2. Use `look demo --dry-run` to preview and adjust
3. Export with `look demo` when satisfied

### For Fine-Tuning

1. Run `look serve` to open the web editor
2. Enter your URL and generate a demo
3. Edit the timeline, script, and effects
4. Export when perfect

### For Complex Demos

1. Use `look walkthrough` for multi-page tours
2. Edit in the web editor
3. Add custom markers and effects
4. Export for your target platform
