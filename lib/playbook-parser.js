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

      // Detect ALL CAPS header (h4 level) like "KEY OBJECTIVES:", "LEAD SOURCES:", "DESCRIPTION:"
      // Also handle indented headers (with leading spaces)
      const trimmedLine = line.trim();
      if (trimmedLine.match(/^[A-Z][A-Z\s&/()\-:]+:$/)) {
        const headerText = trimmedLine.replace(':', '').trim();
        // Get icon for h4 header
        const h4Icon = this._getH4Icon(headerText);
        // Replace emojis with icons (handles escaping internally)
        const headerWithIcons = this._replaceEmojisWithIcons(headerText);
        items.push({ type: 'h4', content: headerWithIcons, icon: h4Icon });
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
      const trimmedLine = line.trim();
      
      // Check for ALL CAPS header FIRST (before processing as list continuation)
      // This prevents headers like "DESCRIPTION:", "KEY CHARACTERISTICS:" from being treated as list continuations
      if (trimmedLine.match(/^[A-Z][A-Z\s&/()\-:]+:$/) && i > startIndex + 1) {
        // End the list when we hit a header
        if (currentItem.length > 0) {
          const itemText = currentItem.join(' ');
          // Replace emojis with icons (handles escaping internally)
          const itemWithIcons = this._replaceEmojisWithIcons(itemText);
          items.push(itemWithIcons);
        }
        break;
      }
      
      // Check for list item marker
      const bulletMatch = line.match(/^[•\-\*]\s+(.+)$/);
      const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
      
      if (bulletMatch || numberedMatch) {
        // Save previous item
        if (currentItem.length > 0) {
          const itemText = currentItem.join(' ');
          // Replace emojis with icons (handles escaping internally)
          const itemWithIcons = this._replaceEmojisWithIcons(itemText);
          items.push(itemWithIcons);
          currentItem = [];
        }
        // Start new item
        currentItem.push(bulletMatch ? bulletMatch[1] : numberedMatch[1]);
      } else if (line.match(/^\s+[•\-\*]\s+/) || line.match(/^\s+\d+\.\s+/)) {
        // Nested list item - end current list
        if (currentItem.length > 0) {
          const itemText = currentItem.join(' ');
          // Replace emojis with icons (handles escaping internally)
          const itemWithIcons = this._replaceEmojisWithIcons(itemText);
          items.push(itemWithIcons);
        }
        break;
      } else if (trimmedLine) {
        // Continuation of current item (only if not a header)
        currentItem.push(trimmedLine);
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
    }

    // Add last item
    if (currentItem.length > 0) {
      const itemText = currentItem.join(' ');
      // Replace emojis with icons (handles escaping internally)
      const itemWithIcons = this._replaceEmojisWithIcons(itemText);
      items.push(itemWithIcons);
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
      const trimmedLine = line.trim();
      
      // Stop at list, header (including indented ALL CAPS headers), or empty line after content
      if (line.match(/^[•\-\*]\s+/) || line.match(/^\d+\.\s+/) || 
          trimmedLine.match(/^[A-Z][A-Z\s&/()\-:]+:$/)) {
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

    // Replace emojis with icons (handles escaping internally)
    const textWithIcons = this._replaceEmojisWithIcons(text);

    return {
      type: 'paragraph',
      content: textWithIcons,
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
   * Get icon for section title
   * Returns Font Awesome icon HTML string
   */
  _getSectionIcon(title) {
    if (!title) return '';
    
    const titleLower = title.toLowerCase();
    const iconMap = {
      'purpose': '<i class="fas fa-flag-checkered" style="color: #3498db;"></i>',
      'research': '<i class="fas fa-search" style="color: #2ecc71;"></i>',
      'eligibility': '<i class="fas fa-check-circle" style="color: #2ecc71;"></i>',
      'value': '<i class="fas fa-gem" style="color: #f39c12;"></i>',
      'proposition': '<i class="fas fa-gem" style="color: #f39c12;"></i>',
      'crm': '<i class="fas fa-database" style="color: #9b59b6;"></i>',
      'integration': '<i class="fas fa-plug" style="color: #9b59b6;"></i>',
      'workflow': '<i class="fas fa-project-diagram" style="color: #9b59b6;"></i>',
      'outreach': '<i class="fas fa-bullhorn" style="color: #e74c3c;"></i>',
      'strategy': '<i class="fas fa-chess" style="color: #e74c3c;"></i>',
      'tactics': '<i class="fas fa-bullseye" style="color: #e74c3c;"></i>',
      'nurturing': '<i class="fas fa-heart" style="color: #e91e63;"></i>',
      'lead': '<i class="fas fa-user-plus" style="color: #e91e63;"></i>',
      'sales': '<i class="fas fa-handshake" style="color: #16a085;"></i>',
      'process': '<i class="fas fa-cogs" style="color: #16a085;"></i>',
      'implementation': '<i class="fas fa-tools" style="color: #34495e;"></i>',
      'order': '<i class="fas fa-shipping-fast" style="color: #27ae60;"></i>',
      'fulfillment': '<i class="fas fa-box" style="color: #27ae60;"></i>',
      'monitoring': '<i class="fas fa-chart-line" style="color: #3498db;"></i>',
      'timeline': '<i class="fas fa-calendar-alt" style="color: #e67e22;"></i>',
      'kpi': '<i class="fas fa-tachometer-alt" style="color: #e67e22;"></i>',
      'tools': '<i class="fas fa-wrench" style="color: #95a5a6;"></i>',
      'platforms': '<i class="fas fa-layer-group" style="color: #95a5a6;"></i>',
      'appendix': '<i class="fas fa-book" style="color: #7f8c8d;"></i>'
    };
    
    for (const [key, icon] of Object.entries(iconMap)) {
      if (titleLower.includes(key)) {
        return icon;
      }
    }
    
    return '<i class="fas fa-file-alt" style="color: #7f8c8d;"></i>'; // Default icon
  }

  /**
   * Get icon for subsection title
   * Returns Font Awesome icon HTML string
   */
  _getSubsectionIcon(title) {
    if (!title) return '';
    
    const titleLower = title.toLowerCase();
    const iconMap = {
      'crop': '<i class="fas fa-seedling" style="color: #27ae60;"></i>',
      'focus': '<i class="fas fa-bullseye" style="color: #27ae60;"></i>',
      'geographic': '<i class="fas fa-map-marked-alt" style="color: #3498db;"></i>',
      'scope': '<i class="fas fa-globe-americas" style="color: #3498db;"></i>',
      'challenge': '<i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>',
      'criteria': '<i class="fas fa-list-check" style="color: #2ecc71;"></i>',
      'offer': '<i class="fas fa-gift" style="color: #f39c12;"></i>',
      'deliver': '<i class="fas fa-truck" style="color: #16a085;"></i>',
      'different': '<i class="fas fa-star" style="color: #f1c40f;"></i>',
      'economic': '<i class="fas fa-dollar-sign" style="color: #27ae60;"></i>',
      'lead capture': '<i class="fas fa-user-plus" style="color: #9b59b6;"></i>',
      'segmentation': '<i class="fas fa-tags" style="color: #9b59b6;"></i>',
      'automation': '<i class="fas fa-robot" style="color: #9b59b6;"></i>',
      'tracking': '<i class="fas fa-chart-bar" style="color: #3498db;"></i>',
      'analytics': '<i class="fas fa-chart-pie" style="color: #3498db;"></i>',
      'calling': '<i class="fas fa-phone" style="color: #e74c3c;"></i>',
      'visit': '<i class="fas fa-map-marker-alt" style="color: #16a085;"></i>',
      'deal': '<i class="fas fa-handshake" style="color: #2ecc71;"></i>',
      'conversion': '<i class="fas fa-exchange-alt" style="color: #2ecc71;"></i>',
      'reporting': '<i class="fas fa-file-chart-line" style="color: #95a5a6;"></i>',
      'identification': '<i class="fas fa-search" style="color: #e74c3c;"></i>',
      'hook point': '<i class="fas fa-fish" style="color: #e74c3c;"></i>',
      'discovery': '<i class="fas fa-lightbulb" style="color: #f39c12;"></i>',
      'communication': '<i class="fas fa-comments" style="color: #3498db;"></i>',
      'nurture': '<i class="fas fa-heart" style="color: #e91e63;"></i>',
      'email': '<i class="fas fa-envelope" style="color: #e91e63;"></i>',
      'qualification': '<i class="fas fa-check-circle" style="color: #16a085;"></i>',
      'proposal': '<i class="fas fa-file-contract" style="color: #16a085;"></i>',
      'pricing': '<i class="fas fa-money-bill-wave" style="color: #27ae60;"></i>',
      'closing': '<i class="fas fa-check-double" style="color: #2ecc71;"></i>',
      'soil test': '<i class="fas fa-vial" style="color: #34495e;"></i>',
      'protocol': '<i class="fas fa-clipboard-list" style="color: #34495e;"></i>',
      'delivery': '<i class="fas fa-shipping-fast" style="color: #27ae60;"></i>'
    };
    
    for (const [key, icon] of Object.entries(iconMap)) {
      if (titleLower.includes(key)) {
        return icon;
      }
    }
    
    return '';
  }

  /**
   * Get icon for h4 headers (ALL CAPS labels)
   */
  _getH4Icon(text) {
    if (!text) return '';

    const titleLower = text.toLowerCase();
    const iconMap = {
      'lead source': '<i class="fas fa-bullseye" style="color: #e74c3c;"></i>',
      'lead capture': '<i class="fas fa-user-plus" style="color: #9b59b6;"></i>',
      'segmentation': '<i class="fas fa-tags" style="color: #9b59b6;"></i>',
      'automation': '<i class="fas fa-robot" style="color: #9b59b6;"></i>',
      'tracking': '<i class="fas fa-chart-line" style="color: #3498db;"></i>',
      'analytics': '<i class="fas fa-chart-pie" style="color: #3498db;"></i>',
      'reporting': '<i class="fas fa-file-alt" style="color: #95a5a6;"></i>',
      'smart calling': '<i class="fas fa-phone-alt" style="color: #e74c3c;"></i>',
      'farm visit': '<i class="fas fa-map-marker-alt" style="color: #16a085;"></i>',
      'deal': '<i class="fas fa-handshake" style="color: #2ecc71;"></i>',
      'pipeline': '<i class="fas fa-project-diagram" style="color: #9b59b6;"></i>',
      'proposal': '<i class="fas fa-file-contract" style="color: #16a085;"></i>',
      'kpi': '<i class="fas fa-tachometer-alt" style="color: #e67e22;"></i>',
      'timeline': '<i class="fas fa-calendar-alt" style="color: #e67e22;"></i>',
      'note': '<i class="fas fa-sticky-note" style="color: #f39c12;"></i>'
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (titleLower.includes(key)) {
        return icon;
      }
    }

    return '<i class="fas fa-circle" style="color: #bdc3c7; font-size: 0.65em;"></i>';
  }

  /**
   * Replace emojis with Font Awesome icons
   * Returns HTML string with icons (not escaped)
   */
  _replaceEmojisWithIcons(text) {
    if (!text) return text;
    
    const emojiMap = {
      '🍎': '<i class="fas fa-apple-alt" style="color: #e74c3c;"></i>',
      '🍑': '<i class="fas fa-seedling" style="color: #f39c12;"></i>',
      '🌰': '<i class="fas fa-seedling" style="color: #8b4513;"></i>',
      '🥑': '<i class="fas fa-leaf" style="color: #27ae60;"></i>',
      '🍊': '<i class="fas fa-lemon" style="color: #f39c12;"></i>',
      '🍇': '<i class="fas fa-wine-bottle" style="color: #8e44ad;"></i>',
      '🥜': '<i class="fas fa-circle" style="color: #d4a574;"></i>'
    };
    
    let result = String(text);
    // First escape the text (except we'll preserve icon HTML)
    // Replace emojis with placeholder, escape, then replace placeholder with icon HTML
    const placeholders = {};
    let placeholderIndex = 0;
    
    for (const [emoji, icon] of Object.entries(emojiMap)) {
      const placeholder = `__ICON_PLACEHOLDER_${placeholderIndex}__`;
      placeholders[placeholder] = icon;
      result = result.replace(new RegExp(emoji, 'g'), placeholder);
      placeholderIndex++;
    }
    
    // Escape HTML
    result = this._escapeHtml(result);
    
    // Replace placeholders with actual icon HTML (now safe since we control it)
    for (const [placeholder, icon] of Object.entries(placeholders)) {
      result = result.replace(new RegExp(placeholder, 'g'), icon);
    }
    
    return result;
  }

  /**
   * Check if content should be formatted as a workflow step
   */
  _isWorkflowStep(text) {
    const workflowPatterns = [
      /^\d+\.\s+(Lead|System|Representative|Automation|Trigger)/i,
      /^Step\s+\d+/i,
      /^\d+\.\s+.*(enters|automatically|triggers|creates|updates)/i
    ];
    return workflowPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if content should be formatted as a crop type card
   */
  _isCropTypeCard(text) {
    const cropTypes = ['POME FRUITS', 'STONE FRUITS', 'PISTACHIOS', 'AVOCADOS', 'CITRUS', 'VINEYARDS', 'PECANS'];
    return cropTypes.some(crop => text.includes(crop));
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
      const sectionTitle = this._replaceEmojisWithIcons(this._escapeHtml(section.title));
      const sectionIcon = this._getSectionIcon(section.title);
      html += `<h2 class="section-header-with-icon">${sectionIcon} <span>${section.number}. ${sectionTitle}</span></h2>\n`;

      // Section content (before subsections)
      section.content.forEach(item => {
        html += this._renderContentItem(item);
      });

      // Subsections
      section.subsections.forEach(subsection => {
        const isGeoScope = subsection.title.toLowerCase().includes('geographic scope');

        const subsectionTitle = this._replaceEmojisWithIcons(this._escapeHtml(subsection.title));
        const subsectionIcon = this._getSubsectionIcon(subsection.title);
        const iconHtml = subsectionIcon ? `${subsectionIcon} ` : '';
        html += `<h3 class="subsection-header-with-icon">${iconHtml}<span>${section.number}.${subsection.number} ${subsectionTitle}</span></h3>\n`;
        
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
        // Content already has icons replaced and HTML escaped
        return `<p>${item.content}</p>\n`;
      
      case 'list':
        const tag = item.numbered ? 'ol' : 'ul';
        // List items already have icons replaced and HTML escaped
        const items = item.items.map(listItem => `<li>${listItem}</li>\n`).join('');
        return `<${tag}>\n${items}</${tag}>\n`;
      
      case 'keyPoints':
        let content = `<div class="key-points">\n`;
        if (item.header) {
          // Header already has icons replaced and HTML escaped
          content += `<h4>${item.header}</h4>\n`;
        }
        item.content.forEach(subItem => {
          content += this._renderContentItem(subItem);
        });
        content += `</div>\n`;
        return content;
      
      case 'h4':
        // Header already has icons replaced and HTML escaped
        const h4Icon = item.icon || '';
        const iconHtml = h4Icon ? `<span class="h4-icon">${h4Icon}</span> ` : '';
        return `<h4 class="h4-with-icon">${iconHtml}<span>${item.content}</span></h4>\n`;
      
      default:
        return '';
    }
  }
}

module.exports = PlaybookParser;
