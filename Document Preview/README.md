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
