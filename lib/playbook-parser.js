const fs = require('fs');
const path = require('path');

/**
 * Playbook Text Parser
 * Converts structured text file to HTML with proper pagination
 */
class PlaybookParser {
  constructor(filePath) {
    this.filePath = filePath;
    this.sections = [];
    this.toc = [];
  }

  /**
   * Parse the text file and convert to HTML
   */
  parse() {
    const content = fs.readFileSync(this.filePath, 'utf-8');
    const lines = content.split('\n');
    
    this.sections = [];
    this.toc = [];
    
    let currentSection = null;
    let currentSubsection = null;
    let currentBlock = [];
    let inTOC = false;
    let inCoverPage = true;
    let coverPageContent = [];
    let tocContent = [];
    let i = 0;

    // Parse cover page, TOC, and sections
    while (i < lines.length) {
      const line = lines[i].trim();
      const rawLine = lines[i];
      const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
      const nextRawLine = i < lines.length - 1 ? lines[i + 1] : '';

      // Detect cover page end and TOC start
      if (line.includes('TABLE OF CONTENTS')) {
        inCoverPage = false;
        inTOC = true;
        i++;
        continue;
      }

      // Handle cover page
      if (inCoverPage) {
        coverPageContent.push(rawLine);
        i++;
        continue;
      }

      // Handle Table of Contents
      if (inTOC) {
        if (line && !line.match(/^=+$/)) {
          tocContent.push(rawLine);
        }
        // Exit TOC when we hit the first section number
        if (line.match(/^\d+\.\s+[A-Z]/) && !line.includes('TABLE OF CONTENTS')) {
          inTOC = false;
          // Don't increment, reprocess this line as section
        } else {
          i++;
          continue;
        }
      }

      // Detect section separator (==========)
      if (line.match(/^=+$/)) {
        // Flush current block
        if (currentBlock.length > 0) {
          this._flushBlock(currentSection, currentSubsection, currentBlock);
          currentBlock = [];
        }
        i++;
        continue;
      }

      // Detect main section (e.g., "1. PURPOSE OF THE DOCUMENT" followed by separator)
      const sectionMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (sectionMatch && nextLine.match(/^=+$/)) {
        // Flush previous content
        if (currentBlock.length > 0) {
          this._flushBlock(currentSection, currentSubsection, currentBlock);
          currentBlock = [];
        }

        const sectionNum = parseInt(sectionMatch[1]);
        const sectionTitle = sectionMatch[2];

        currentSection = {
          number: sectionNum,
          title: sectionTitle,
          id: `section${sectionNum}`,
          subsections: [],
          content: []
        };
        
        this.sections.push(currentSection);
        currentSubsection = null;
        i += 2; // Skip section line and separator
        continue;
      }

      // Detect subsection (e.g., "3.1 Crop Focus (Expanded)")
      const subsectionMatch = line.match(/^(\d+)\.(\d+)\s+(.+)$/);
      if (subsectionMatch && currentSection) {
        // Flush current block
        if (currentBlock.length > 0) {
          this._flushBlock(currentSection, currentSubsection, currentBlock);
          currentBlock = [];
        }

        const subNum = subsectionMatch[2];
        const subTitle = subsectionMatch[3];
        
        currentSubsection = {
          number: subNum,
          title: subTitle,
          id: `${currentSection.id}-${subNum}`,
          content: []
        };
        
        currentSection.subsections.push(currentSubsection);
        i++;
        continue;
      }

      // Ignore content that is not within a detected section
      if (currentSection === null) {
        i++;
        continue;
      }
      
      if (line || rawLine === '') {
        // Empty line might signal end of block
        if (!line && currentBlock.length > 0) {
          this._flushBlock(currentSection, currentSubsection, currentBlock);
          currentBlock = [];
        } else if (line) {
          currentBlock.push(rawLine);
        }
      }
      
      i++;
    }

    // Flush last block
    if (currentBlock.length > 0) {
      this._flushBlock(currentSection, currentSubsection, currentBlock);
    }

    return {
      coverPage: coverPageContent,
      toc: this._parseTOC(tocContent),
      sections: this.sections
    };
  }

  /**
   * Flush current block to appropriate container
   */
  _flushBlock(section, subsection, block) {
    if (!section || block.length === 0) return;

    const processed = this._processBlock(block);
    if (!processed || processed.length === 0) return;

    if (subsection) {
      subsection.content.push(...processed);
    } else {
      section.content.push(...processed);
    }
  }

  /**
   * Process a block of lines into content items
   */
  _processBlock(lines) {
    const items = [];
    const trimmedLines = lines.map(l => l.trim()).filter(l => l);
    
    if (trimmedLines.length === 0) return items;

    let i = 0;
    while (i < trimmedLines.length) {
      const line = trimmedLines[i];
      const nextLine = i < trimmedLines.length - 1 ? trimmedLines[i + 1] : '';

      // Detect ALL CAPS header (h4 level) like "KEY OBJECTIVES:", "LEAD SOURCES:"
      if (line.match(/^[A-Z][A-Z\s&/()\-:]+:$/)) {
        const headerText = line.replace(':', '').trim();
        items.push({ type: 'h4', content: this._escapeHtml(headerText) });
        i++;
        continue;
      }

      // Detect key points box (starts with "KEY", "NOTE:", "DATA TO CAPTURE")
      if (line.match(/^(KEY|NOTE:|DATA TO CAPTURE)/i)) {
        const keyPointsBox = this._processKeyPointsBox(trimmedLines, i);
        if (keyPointsBox) {
          items.push(keyPointsBox);
          i = keyPointsBox.endIndex + 1;
          continue;
        }
      }

      // Detect list (starts with bullet or number)
      if (line.match(/^[•\-\*]\s+/) || line.match(/^\d+\.\s+/)) {
        const list = this._processList(trimmedLines, i);
        if (list) {
          items.push(list);
          i = list.endIndex + 1;
          continue;
        }
      }

      // Regular paragraph(s)
      const paragraph = this._processParagraph(trimmedLines, i);
      if (paragraph) {
        items.push(paragraph);
        i = paragraph.endIndex + 1;
        continue;
      }

      i++;
    }

    return items;
  }

  /**
   * Process a key points box
   */
  _processKeyPointsBox(lines, startIndex) {
    let i = startIndex;
    const header = lines[i];
    const contentLines = [];
    i++;

    // Collect content until next major element
    while (i < lines.length) {
      const line = lines[i];
      
      // Stop at next header or section marker
      if (line.match(/^[A-Z][A-Z\s&/()\-:]+:$/) && i > startIndex + 1) {
        break;
      }
      
      contentLines.push(line);
      i++;
      
      // Stop after reasonable content
      if (contentLines.length > 20) break;
    }

    const content = this._processBlock(contentLines.map(l => `  ${l}`));
    
    return {
      type: 'keyPoints',
      header: this._escapeHtml(header),
      content: content,
      endIndex: i - 1
    };
  }

  /**
   * Process a list
   */
  _processList(lines, startIndex) {
    let i = startIndex;
    const items = [];
    const isNumbered = lines[i].match(/^\d+\.\s+/);
    let currentItem = [];

    while (i < lines.length) {
      const line = lines[i];
      
      // Check for list item marker
      const bulletMatch = line.match(/^[•\-\*]\s+(.+)$/);
      const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
      
      if (bulletMatch || numberedMatch) {
        // Save previous item
        if (currentItem.length > 0) {
          items.push(this._escapeHtml(currentItem.join(' ')));
          currentItem = [];
        }
        // Start new item
        currentItem.push(bulletMatch ? bulletMatch[1] : numberedMatch[1]);
      } else if (line.match(/^\s+[•\-\*]\s+/) || line.match(/^\s+\d+\.\s+/)) {
        // Nested list item - end current list
        if (currentItem.length > 0) {
          items.push(this._escapeHtml(currentItem.join(' ')));
        }
        break;
      } else if (line.trim()) {
        // Continuation of current item
        currentItem.push(line.trim());
      } else {
        // Empty line might be end of list
        if (i > startIndex && items.length > 0) {
          if (currentItem.length > 0) {
            items.push(this._escapeHtml(currentItem.join(' ')));
          }
          break;
        }
      }
      
      i++;
      
      // Stop at next header or major element
      if (line.match(/^[A-Z][A-Z\s&/()\-:]+:$/) && i > startIndex + 2) {
        break;
      }
    }

    // Add last item
    if (currentItem.length > 0) {
      items.push(this._escapeHtml(currentItem.join(' ')));
    }

    if (items.length === 0) return null;

    return {
      type: 'list',
      numbered: isNumbered,
      items: items,
      endIndex: i - 1
    };
  }

  /**
   * Process a paragraph
   */
  _processParagraph(lines, startIndex) {
    let i = startIndex;
    const paragraphLines = [];

    while (i < lines.length) {
      const line = lines[i];
      
      // Stop at list, header, or empty line after content
      if (line.match(/^[•\-\*]\s+/) || line.match(/^\d+\.\s+/) || 
          line.match(/^[A-Z][A-Z\s&/()\-:]+:$/)) {
        break;
      }
      
      if (!line && paragraphLines.length > 0) {
        break;
      }
      
      if (line) {
        paragraphLines.push(line);
      }
      
      i++;
    }

    if (paragraphLines.length === 0) return null;

    const text = paragraphLines.join(' ').trim();
    if (!text) return null;

    return {
      type: 'paragraph',
      content: this._escapeHtml(text),
      endIndex: i - 1
    };
  }

  /**
   * Parse cover page content
   */
  _parseCoverPage(lines) {
    return lines;
  }

  /**
   * Parse table of contents
   */
  _parseTOC(lines) {
    const toc = [];
    let currentSection = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.match(/^=+$/)) continue;

      // Main section (e.g., "1. PURPOSE OF THE DOCUMENT ........................................... Page 1")
      const sectionMatch = trimmed.match(/^(\d+)\.\s+(.+?)\s+\.{3,}\s+Page\s+\d+$/);
      if (sectionMatch) {
        currentSection = {
          number: parseInt(sectionMatch[1]),
          title: sectionMatch[2].trim(),
          subsections: []
        };
        toc.push(currentSection);
        continue;
      }

      // Subsection (indented, e.g., "   3.1 Crop Focus (Expanded)")
      const subsectionMatch = trimmed.match(/^\s+(\d+)\.(\d+)\s+(.+)$/);
      if (subsectionMatch && currentSection) {
        currentSection.subsections.push({
          number: subsectionMatch[2],
          title: subsectionMatch[3].trim()
        });
      }
    }

    return toc;
  }

  /**
   * Escape HTML special characters
   */
  _escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Convert parsed structure to HTML
   */
  toHTML(parsed) {
    let html = '';

    // Cover page
    html += this._renderCoverPage(parsed.coverPage);

    // Remove skipped sections (e.g., original section 2) and renumber sequentially
    const normalizedSections = this._filterAndRenumberSections(parsed.sections);

    // Generate TOC from parsed sections (not from TOC text section)
    const generatedTOC = this._generateTOCFromSections(normalizedSections);
    
    // Table of Contents
    html += this._renderTOC(generatedTOC);

    // Sections
    // Each section starts on a new page, content will flow to next page if exceeds 11in
    normalizedSections.forEach((section, idx) => {
      html += `<div class="page" id="section${section.number}">\n`;
      html += `<div class="page-content">\n`;
      html += `<h2>${section.number}. ${this._escapeHtml(section.title)}</h2>\n`;

      // Section content (before subsections)
      section.content.forEach(item => {
        html += this._renderContentItem(item);
      });

      // Subsections
      section.subsections.forEach(subsection => {
        const isGeoScope = subsection.title.toLowerCase().includes('geographic scope');

        html += `<h3>${section.number}.${subsection.number} ${this._escapeHtml(subsection.title)}</h3>\n`;
        
        if (isGeoScope) {
          html += '<div class="geo-scope-wrap">';
        }

        subsection.content.forEach(item => {
          html += this._renderContentItem(item);
        });

        if (isGeoScope) {
          html += this._renderGeographicScopeImage();
          html += '</div>';
        }
      });

      html += '</div>\n'; // Close page-content
      
      // Page 1 = Cover, Page 2 = TOC, Page 3+ = Sections
      const adjustedPageNumber = 2 + idx + 1;
      html += `<div class="page-number">${adjustedPageNumber}</div>\n`;
      html += '</div>\n'; // Close page
    });

    return html;
  }

  /**
   * Remove excluded sections (like original #2) and renumber sequentially
   */
  _filterAndRenumberSections(sections) {
    const allowed = sections.filter(
      (section) => section.number !== 2 && !/marketing\/sales pipeline overview/i.test(section.title || '')
    );

    return allowed.map((section, idx) => {
      const newNumber = idx + 1;
      return {
        ...section,
        number: newNumber,
        id: `section${newNumber}`,
        subsections: section.subsections.map((sub) => ({
          ...sub,
          id: `section${newNumber}-${sub.number}`
        }))
      };
    });
  }

  /**
   * Render a branded image container for the geographic scope map
   */
  _renderGeographicScopeImage() {
    return `
<div class="image-container geo-scope">
  <img src="assets/300miradiouspicture.png" alt="300-mile target radius from SSW operations" />
  <div class="image-caption">300-mile priority radius from SSW operations</div>
</div>
`;
  }

  /**
   * Generate TOC from parsed sections
   */
  _generateTOCFromSections(sections) {
    return sections.map(section => {
      const tocSection = {
        number: section.number,
        title: section.title,
        subsections: section.subsections.map(sub => ({
          number: sub.number,
          title: sub.title
        }))
      };
      return tocSection;
    });
  }

  /**
   * Render cover page
   */
  _renderCoverPage(lines) {
    let html = '<div class="page" id="cover">\n';
    html += '<div class="cover-page">\n';
    html += '<div class="logo-container">\n';
    html += '<img src="assets/logo/ssw-logo.png" alt="Soil Seed & Water Logo" class="logo" id="ssw-logo" style="display: none" />\n';
    html += '</div>\n';
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      const rawLine = lines[i];
      
      if (line.includes('SOIL SEED & WATER') && line.match(/^=+$/)) {
        // Skip separator
      } else if (line.includes('SOIL SEED & WATER')) {
        html += '<div style="font-size: 16pt; margin-bottom: 20pt; color: #7f8c8d">SOIL SEED & WATER</div>\n';
      } else if (line.match(/^A specialty/)) {
        html += '<div class="cover-title">\n';
        const titleLines = [];
        while (i < lines.length && lines[i].trim() && !lines[i].trim().includes('Business-to-Business')) {
          titleLines.push(lines[i].trim());
          i++;
        }
        i--; // Back up
        html += titleLines.map(l => `<br />${this._escapeHtml(l)}`).join('') + '\n';
        html += '</div>\n';
      } else if (line.includes('Business-to-Business')) {
        html += `<div class="cover-subtitle">${this._escapeHtml(line)}</div>\n`;
      } else if (line.match(/Complete Guide/)) {
        const descLines = [];
        while (i < lines.length && lines[i].trim() && !lines[i].trim().match(/Version/)) {
          descLines.push(lines[i].trim());
          i++;
        }
        i--; // Back up
        html += '<div style="font-size: 12pt; margin-top: 30pt; color: #7f8c8d">\n';
        html += descLines.map(l => `${this._escapeHtml(l)}<br />`).join('') + '\n';
        html += '</div>\n';
      } else if (line.match(/Version/)) {
        html += '<div class="cover-info">\n<br /><br />\n';
        html += `${this._escapeHtml(line)}<br />\n`;
        if (i + 1 < lines.length) {
          html += `${this._escapeHtml(lines[++i].trim())}\n`;
        }
        html += '</div>\n';
      } else if (line.match(/This document provides/)) {
        html += '<div style="margin-top: 60pt; font-size: 10pt; color: #95a5a6; max-width: 6in; margin-left: auto; margin-right: auto">\n';
        const docLines = [];
        while (i < lines.length && lines[i].trim() && !lines[i].trim().includes('TABLE OF CONTENTS')) {
          docLines.push(lines[i].trim());
          i++;
        }
        i--; // Back up
        html += docLines.map(l => `${this._escapeHtml(l)}<br />`).join('') + '\n';
        html += '</div>\n';
        break;
      }
      i++;
    }
    
    html += '</div>\n';
    html += '<div class="page-number">1</div>\n';
    html += '</div>\n';
    
    return html;
  }

  /**
   * Render table of contents
   */
  _renderTOC(toc) {
    let html = '<div class="page" id="toc">\n';
    html += '<h1>TABLE OF CONTENTS</h1>\n';
    html += '<div class="toc">\n';
    
    let pageCounter = 2; // Start after cover page
    toc.forEach((section, idx) => {
      // Calculate page number (accounting for section 2 removal)
      const pageNumber = pageCounter + idx + 1;
      
      html += `<div class="toc-item">\n`;
      html += `<a href="#section${section.number}">${section.number}. ${this._escapeHtml(section.title)} <span>Page ${pageNumber}</span></a>\n`;
      
      if (section.subsections && section.subsections.length > 0) {
        section.subsections.forEach(sub => {
          html += `<div class="toc-subitem"><a href="#section${section.number}">${section.number}.${sub.number} ${this._escapeHtml(sub.title)}</a></div>\n`;
        });
      }
      
      html += '</div>\n';
    });
    
    html += '</div>\n';
    html += '<div class="page-number">2</div>\n';
    html += '</div>\n';
    
    return html;
  }

  /**
   * Render a content item to HTML
   */
  _renderContentItem(item) {
    if (!item) return '';

    switch (item.type) {
      case 'paragraph':
        return `<p>${item.content}</p>\n`;
      
      case 'list':
        const tag = item.numbered ? 'ol' : 'ul';
        const items = item.items.map(item => `<li>${item}</li>\n`).join('');
        return `<${tag}>\n${items}</${tag}>\n`;
      
      case 'keyPoints':
        let content = `<div class="key-points">\n`;
        if (item.header) {
          content += `<h4>${item.header}</h4>\n`;
        }
        item.content.forEach(subItem => {
          content += this._renderContentItem(subItem);
        });
        content += `</div>\n`;
        return content;
      
      case 'h4':
        return `<h4>${item.content}</h4>\n`;
      
      default:
        return '';
    }
  }
}

module.exports = PlaybookParser;
