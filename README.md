# A specialty farmer. Program execution. Playbook.

**Business-to-Business Market Segment**

Complete guide for targeting, engaging, selling, implementing, and supporting specialty orchard, vineyard, and avocado clients using Pomona and SSW protocols.

---

## Project Overview

This project creates a comprehensive, standardized execution playbook for Soil Seed & Water representatives to approach specialty orchard and vineyard farmers. The document provides a complete sales and implementation system from initial outreach through customer success.

### Purpose

Provide SSW representatives with a clear, standardized roadmap for:
- Targeting specialty orchard, vineyard, and avocado clients
- Engaging prospects through multi-channel outreach
- Selling regenerative orchard programs
- Implementing Pomona and supporting protocols
- Supporting clients through monitoring and follow-up

### Target Market

**Business-to-Business (Specialty Farmer) Market Segment**

**Crop Focus:**
- Pistachios
- Pome fruits (apples, pears)
- Stone fruits (peaches, plums, cherries, apricots, nectarines)
- Vineyards (grapes)
- Avocados
- Citrus (oranges, lemons, limes, grapefruit)
- Other high-value orchard, vineyard, and avocado crops in region

**Geographic Scope:** 300-mile target radius from SSW operations

---

## Project Structure

```
Orchards Program/
├── README.md                          # This file - project overview and context
├── package.json                       # Node.js dependencies and scripts
├── Document Preview/                  # Interactive HTML preview
│   ├── playbook-preview.html         # Main preview document (PDF-ready)
│   ├── assets/
│   │   └── logo/
│   │       └── ssw-logo.png          # Soil Seed & Water logo
│   └── README.md                     # Preview setup instructions
├── Supporting Documents/             # Working documents and references
│   ├── Orchards Program Execution Playbook.txt
│   ├── Orchards Program Outline 2.txt
│   └── Orchards Program Outline.txt
└── Pomona - Spec Sheet - SSW.docx     # Product specification sheet
```

---

## Document Sections

1. **Purpose of the Document** - Overview and objectives
2. **Marketing/Sales Pipeline Overview** - Visual pipeline flow
3. **Research & Eligibility** - Crop focus, geographic scope, challenges
4. **Value Proposition** - What, why, how, and why SSW is different
5. **CRM Integration** - Complete workflow with automation
6. **Outreach Strategy & Tactics** - Prospect identification, hook points, discovery
7. **Lead Nurturing Strategy** - Email sequences, newsletters, samples
8. **Sales Process** - Qualification, site visits, proposals, closing
9. **Implementation** - Soil tests, protocols, fulfillment, monitoring
10. **Timeline & KPIs** - Annual calendar and performance targets
11. **Tools & Platforms** - CRM, route planner, AI advisors
12. **Appendix** - Templates, scripts, protocols, resources

---

## Key Features

### Sales-Focused Approach
- Standardized sales methodology
- CRM integration at every stage
- Measurable KPIs and timelines
- Repeatable system for scaling

### CRM Integration
- Lead capture and segmentation
- Automated campaigns (Hook Point, value drips)
- Smart calling workflows
- Farm visit documentation
- Pipeline tracking and reporting

### Timeline & Execution
- **Dec 15, 2024** - Research and map all specialty growers, enter into CRM
- **Jan 1, 2025** - Launch Hook Point campaign
- **Jan 15, 2025** - Deploy value message drip sequence
- **Feb 1, 2025** - Begin Smart Calling based on engagement
- **Monthly 2025** - Site visits and field documentation
- **Ongoing** - Weekly analytics review, newsletters, tradeshows

---

## CEO Feedback & Requirements (Mike McMahon - Nov 19, 2024)

### Key Refinements Requested:

1. **Market Segment Clarity** - Clearly identify as B2B (Specialty Farmer) Market Segment
2. **Expanded Crop Focus** - Include vineyards, avocados, citrus, and other high-value crops
3. **Marketing/Sales Pipeline Graphic** - Visual pipeline flow diagram
4. **Complete CRM Integration** - Detailed workflows for every stage
5. **Concrete Timeline** - Specific dates and actionable tasks
6. **Communication Templates** - Sean example sequence documented
7. **Newsletters & Samples** - Consistent outreach plan
8. **Tradeshow Calendar** - Events and protocols

---

## Quick Start (non-developer)

1) View the doc  
`open "Document Preview/playbook-preview.html"`  
or run `npm run preview` and go to http://localhost:8080 (no live reload; best for stable layout).

2) Edit text  
Open `Document Preview/playbook-preview.html` and change the words you want. Headings already start on new pages.

3) Add/move photos  
- Put the image file in `Document Preview/assets/`.  
- Find the spot you want and drop in:
  ```html
  <div class="image-container">
    <img src="assets/YourFile.jpg" alt="Alt text" />
    <div class="image-caption">Caption</div>
  </div>
  ```
- For the three product bags, there is an auto-insert right after the paragraph that starts “All blends are granular formulations…”. If you want them somewhere else, move that paragraph or paste the block above where you want it.

4) Refresh to see changes  
Use Cmd+Shift+R (hard refresh) in the browser so the page splitter reruns and the layout settles.

5) Export to PDF  
Click the download button (top-left) in the preview. It keeps the current layout and page breaks.

## Development & Usage (advanced)

- `npm run preview` — static server on http://localhost:8080 (recommended to preserve layout).  
- `npm run dev` / `npm run dev:open` — live reload; only use if you need it. The app now skips re-fetching content when static pages are present to avoid duplicate TOC/pages.

## Simple rules to avoid layout issues

- Do not add a second Table of Contents. The existing one at the top flows across pages automatically.
- Keep headings as they are; page splitting already starts new sections on a fresh page.
- After any edit, hard refresh to let the splitter rebalance pages.
- Leave CSS alone unless you intend to change the overall look.

---

## Key Objectives

- Standardize sales approach across all representatives
- Provide clear, actionable steps from lead generation to customer success
- Integrate CRM workflows at every stage of the sales process
- Establish measurable KPIs and timelines for program execution
- Create a repeatable system for scaling orchard, vineyard, and avocado client acquisition

---

## Target Audience

- Sales representatives targeting specialty farmers
- Field representatives conducting site visits
- Marketing team developing campaigns and content
- Management tracking performance and pipeline metrics
- Operations team coordinating fulfillment and delivery

---

## Common Challenges Addressed

### Crop Challenges:
- Low organic matter (OM)
- Soil compaction
- Water inefficiency
- Micronutrient deficiencies
- Low water-holding capacity
- Weed pressure
- Low microbial activity
- Poor nutrient uptake

### Farmer Challenges:
- Limited equipment access
- Soil knowledge gaps
- Logistics constraints
- Cost management pressures

---

## Value Proposition

**What:** Long-term orchard health + regeneration through Pomona and supporting protocols

**Why:**
- Extended orchard lifespan
- Improved soil health
- Economic gains (yield lift, fertilizer reduction)
- Reduced input costs over time
- Enhanced water efficiency

**How:**
- Orchard-specific treatment protocols
- Customized supplement blends
- Seasonal application schedules
- Ongoing field support and consulting

**Why SSW is Different:**
- True partnership approach (not just product sales)
- Deep expertise in regenerative agriculture
- Production capacity and consistency
- Comprehensive field support
- Consulting and advisory services
- Trucking and logistics support
- Equipment support and coordination

---

## Dependencies

- **html2pdf.js** - PDF generation (loaded via CDN)
- **http-server** - Local development server
- **nodemon** - Auto-reload on file changes

---

## Dynamic Document System (Developer Guide)

- **Single source of truth:** `Orchards Program Execution Playbook.txt` is parsed by `lib/playbook-parser.js` (sections/subsections via regex, Section 2 skipped, TOC auto-generated, geo-map image injected from `assets/300miradiouspicture.png`).
- **Render flow:** `server.js` watches the text file → `/api/playbook` returns parsed HTML → `Document Preview/playbook-preview.html` injects it into `<!-- DYNAMIC_CONTENT -->`, then `splitContentIntoPages()` enforces 8.5"×11" pages with fixed page numbers.
- **Layout guardrails:** Keep `.page` + `.page-content` structure, 11in height, and the page-splitting script intact. Do not re-enable Section 2 or remove the per-page numbering.
- **PDF export:** Triggered by the download icon; `Document Preview/error-handler.js` captures each rendered page (as seen) with html2canvas + jsPDF. UI is hidden temporarily; pages are captured at letter size with no reflow.
- **Adding content:** Prefer editing the text file using the existing section pattern (`N. title` with `=========` divider) and bullet styles (`•` or `1.`). Headings move with their first list/paragraph automatically.
- **Adding images/graphics:** Place assets in `Document Preview/assets/`. Inject via parser or a controlled hook, using `<div class="image-container"><img src="assets/your-file.png" alt="..." /><div class="image-caption">Caption</div></div>`. Avoid editing the injected content blob directly—changes there are overwritten on next parse.
- **Troubleshooting layout:** If an AI/model changes CSS and pages stretch or lists jump pages, restore 11in page height, keep page splitting enabled, and ensure `page-break-*` rules on h2/h3 remain.

---

## Notes

- All proprietary information is confidential and intended solely for internal use
- Document version: 2.0 (Updated: November 2024)
- Logo will automatically appear on cover page when placed in `assets/logo/ssw-logo.png`
- PDF export maintains proper formatting, page numbers, and white pages
- Pages are white with colored background for easy visual distinction

---

## Project Status

✅ Document structure and outline completed  
✅ HTML preview with PDF export functionality  
✅ Logo support integrated  
✅ CRM workflow sections defined  
⏳ Content development in progress (Section 1 complete, Sections 2-12 pending)

---

## Contact & Support

For questions or updates to this playbook, contact:
- **Project Lead:** Rodolfo Alvarez (ralvarez@soilseedandwater.com)
- **CEO Feedback:** Mike McMahon

---

*Last Updated: November 2024*
