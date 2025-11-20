# Document Preview - Setup Instructions

## Logo Setup

To add the Soil Seed & Water logo to the cover page:

1. Place your logo file in: `assets/logo/ssw-logo.png`
2. Supported formats: PNG, JPG, SVG
3. Recommended size: 200x200 pixels (will auto-scale)
4. The logo will automatically appear on the cover page once placed

## PDF Export

- Click the "📄 Export to PDF" button in the top-left corner
- The PDF will maintain proper formatting, page breaks, and white pages
- All images (including logo) will be included in the PDF

## Live Preview

- From the project root, run `npm run dev` for a live-reloading server at `http://localhost:8080`
- On macOS, `npm run dev:open` will start the server and launch your browser automatically
- Save changes in `playbook-preview.html` and the browser refreshes immediately

## Dynamic Content Pipeline (important)

- **Source of truth:** `Orchards Program Execution Playbook.txt` (parsed by `lib/playbook-parser.js`).
- **Render flow:** `server.js` watches the text file → `/api/playbook` returns parsed HTML → `playbook-preview.html` injects it at `<!-- DYNAMIC_CONTENT -->` → `splitContentIntoPages()` keeps pages at 8.5"×11".
- **Do not** paste static content above/inside the `<!-- DYNAMIC_CONTENT -->` marker; it will be overwritten by the parser on next load.
- **Layout guardrails:** Keep the `.page`/`.page-content` wrapper, 11in height, and the page-splitting script intact. h2 forces new pages; headings stay with their first list/paragraph.
- **Section 2 is intentionally skipped** by the parser; do not reintroduce it.

## Adding images/graphics (safe workflow)

1) Drop files in `Document Preview/assets/` (e.g., `assets/my-image.png`).  
2) Add via parser or a controlled hook using:
```html
<div class="image-container">
  <img src="assets/my-image.png" alt="Description" />
  <div class="image-caption">Optional caption</div>
</div>
```
3) Avoid placing raw `<img>` tags inside the injected content block unless the parser handles it—manual edits there are replaced on re-parse.  
4) Geo-map uses `assets/300miradiouspicture.png`; replace that file to update the map without changing code.

## File Structure

```
Document Preview/
├── playbook-preview.html (main preview file)
├── assets/
│   └── logo/
│       └── ssw-logo.png (place your logo here)
└── README.md (this file)
```

## Notes

- Pages are white with a colored background for easy distinction
- Logo will be hidden if file is not found (no errors)
- PDF export handles images automatically
