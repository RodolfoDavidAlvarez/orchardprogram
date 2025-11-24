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
    
    // Image mapping framework - automatically maps content to images
    this.imageMap = {
      // Product images
      'pomona': {
        image: 'assets/Pomona10lbs.jpg',
        alt: 'Pomona Blend - 9 lb bag',
        caption: 'Pomona Blend - 9 lb bag',
        class: 'product-image'
      },
      'seriokai': {
        image: 'assets/Seriokai10lbs.jpg',
        alt: 'Seriokai\'s Secret Blend - 9 lb bag',
        caption: 'Seriokai\'s Secret Blend - 9 lb bag',
        class: 'product-image'
      },
      'serikai': {
        image: 'assets/Seriokai10lbs.jpg',
        alt: 'Seriokai\'s Secret Blend - 9 lb bag',
        caption: 'Seriokai\'s Secret Blend - 9 lb bag',
        class: 'product-image'
      },
      'bucchas': {
        image: 'assets/Bacchus1CF.jpg',
        alt: 'Bacchus Blend - 1 CF bag',
        caption: 'Bacchus Blend - 1 CF bag',
        class: 'product-image'
      },
      'bacchus': {
        image: 'assets/Bacchus1CF.jpg',
        alt: 'Bacchus Blend - 1 CF bag',
        caption: 'Bacchus Blend - 1 CF bag',
        class: 'product-image'
      },
      // Section images
      'crop focus': {
        image: 'assets/Crop focus.png',
        alt: 'Crop Focus',
        caption: 'Crop Focus',
        class: 'crop-focus-image'
      },
      'common crop challenges': {
        image: 'assets/orchard soil compaction.png',
        alt: 'Orchard soil compaction',
        caption: 'Orchard soil compaction',
        class: 'crop-challenges-image'
      },
      'geographic scope': {
        image: 'assets/300miradiouspicture.png',
        alt: '300-mile target radius from SSW operations',
        caption: '300-mile priority radius from SSW operations',
        class: 'geo-scope'
      }
    };
    
    // Track which images have been added to avoid duplicates
    this.addedImages = new Set();
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
        // Exit TOC when we hit the first actual section (not a TOC entry)
        // TOC entries have "Page X" at the end, actual sections don't
        if (line.match(/^\d+\.\s+[A-Z]/) && !line.includes('TABLE OF CONTENTS') && !line.includes('Page')) {
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

      // Detect full page image reference [FULLPAGE_IMAGE: path/to/image.png]
      if (line.match(/^\[FULLPAGE_IMAGE:\s*(.+)\]$/i)) {
        const imageMatch = line.match(/^\[FULLPAGE_IMAGE:\s*(.+)\]$/i);
        if (imageMatch) {
          const imagePath = imageMatch[1].trim();
          items.push({ type: 'fullpageImage', content: imagePath });
          i++;
          continue;
        }
      }

      // Detect image reference [IMAGE: path/to/image.png]
      if (line.match(/^\[IMAGE:\s*(.+)\]$/i)) {
        const imageMatch = line.match(/^\[IMAGE:\s*(.+)\]$/i);
        if (imageMatch) {
          const imagePath = imageMatch[1].trim();
          items.push({ type: 'image', content: imagePath });
          i++;
          continue;
        }
      }

      // Detect ALL CAPS header (h4 level) like "KEY OBJECTIVES:", "LEAD SOURCES:", "VINEYARD/WINERY"
      if (line.match(/^[A-Z][A-Z\s&/()\-:]+:$/) || 
          (line.match(/^[A-Z][A-Z\s&/()\-]+$/) && line.length > 5 && !line.match(/^TOTAL/))) {
        const headerText = line.replace(':', '').trim();
        items.push({ type: 'h4', content: this._escapeHtml(headerText) });
        i++;
        continue;
      }

      // Detect specialized content boxes
      if (line.match(/^(KEY|NOTE:|DATA TO CAPTURE)/i)) {
        const keyPointsBox = this._processKeyPointsBox(trimmedLines, i);
        if (keyPointsBox) {
          items.push(keyPointsBox);
          i = keyPointsBox.endIndex + 1;
          continue;
        }
      }

      // Detect email templates
      if (line.match(/^EMAIL TEMPLATE:|^SUBJECT:|^FROM:|^TO:/i)) {
        const emailBox = this._processEmailBox(trimmedLines, i);
        if (emailBox) {
          items.push(emailBox);
          i = emailBox.endIndex + 1;
          continue;
        }
      }

      // Detect hook points
      if (line.match(/^HOOK POINT:|^HOOK:/i)) {
        const hookBox = this._processHookPointBox(trimmedLines, i);
        if (hookBox) {
          items.push(hookBox);
          i = hookBox.endIndex + 1;
          continue;
        }
      }

      // Detect examples
      if (line.match(/^EXAMPLE:|^CASE STUDY:/i)) {
        const exampleBox = this._processExampleBox(trimmedLines, i);
        if (exampleBox) {
          items.push(exampleBox);
          i = exampleBox.endIndex + 1;
          continue;
        }
      }

      // Detect emphasis titles
      if (line.match(/^EMPHASIS:|^IMPORTANT:|^CRITICAL:/i)) {
        const emphasisTitle = this._processEmphasisTitle(trimmedLines, i);
        if (emphasisTitle) {
          items.push(emphasisTitle);
          i = emphasisTitle.endIndex + 1;
          continue;
        }
      }

      // Detect prospect table entries (numbered items followed by Address/Phone/Email/Website)
      const prospectTable = this._processProspectTable(trimmedLines, i);
      if (prospectTable) {
        items.push(prospectTable);
        i = prospectTable.endIndex + 1;
        continue;
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
   * Process email template box
   */
  _processEmailBox(lines, startIndex) {
    let i = startIndex;
    const emailData = {
      subject: '',
      from: '',
      to: '',
      body: []
    };
    
    // Process header fields
    while (i < lines.length) {
      const line = lines[i];
      
      if (line.match(/^SUBJECT:\s*(.+)$/i)) {
        emailData.subject = RegExp.$1.trim();
      } else if (line.match(/^FROM:\s*(.+)$/i)) {
        emailData.from = RegExp.$1.trim();
      } else if (line.match(/^TO:\s*(.+)$/i)) {
        emailData.to = RegExp.$1.trim();
      } else if (line.trim() === '' || line.match(/^-{3,}$/)) {
        i++;
        break; // Start of body
      }
      i++;
    }
    
    // Process body
    while (i < lines.length) {
      const line = lines[i];
      
      // Stop at next header or section marker
      if (line.match(/^[A-Z][A-Z\s&/()\-:]+:$/) && i > startIndex + 5) {
        break;
      }
      
      if (line.trim() === '' && emailData.body.length > 10) {
        break; // Reasonable email length
      }
      
      emailData.body.push(line);
      i++;
      
      if (i - startIndex > 30) break; // Safety limit
    }
    
    return {
      type: 'email',
      emailData: emailData,
      endIndex: i - 1
    };
  }

  /**
   * Process hook point box
   */
  _processHookPointBox(lines, startIndex) {
    let i = startIndex;
    const header = lines[i];
    const contentLines = [];
    i++;
    
    while (i < lines.length && contentLines.length < 5) {
      const line = lines[i];
      
      if (line.match(/^[A-Z][A-Z\s&/()\-:]+:$/) && i > startIndex + 1) {
        break;
      }
      
      if (line.trim()) {
        contentLines.push(line.trim());
      } else if (contentLines.length > 0) {
        break;
      }
      
      i++;
    }
    
    return {
      type: 'hookPoint',
      content: contentLines.join(' '),
      endIndex: i - 1
    };
  }

  /**
   * Process example box
   */
  _processExampleBox(lines, startIndex) {
    let i = startIndex;
    const header = lines[i];
    const contentLines = [];
    i++;
    
    while (i < lines.length) {
      const line = lines[i];
      
      if (line.match(/^[A-Z][A-Z\s&/()\-:]+:$/) && i > startIndex + 3) {
        break;
      }
      
      contentLines.push(line);
      i++;
      
      if (contentLines.length > 15) break;
    }
    
    const content = this._processBlock(contentLines.map(l => `  ${l}`));
    
    return {
      type: 'example',
      header: this._escapeHtml(header),
      content: content,
      endIndex: i - 1
    };
  }

  /**
   * Process emphasis title
   */
  _processEmphasisTitle(lines, startIndex) {
    const line = lines[startIndex];
    const match = line.match(/^(EMPHASIS:|IMPORTANT:|CRITICAL:)\s*(.+)$/i);
    
    if (match) {
      return {
        type: 'emphasisTitle',
        content: this._escapeHtml(match[2].trim()),
        endIndex: startIndex
      };
    }
    
    return null;
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
   * Process prospect table entries (numbered items with Address/Phone/Email/Website)
   */
  _processProspectTable(lines, startIndex) {
    let i = startIndex;
    const prospects = [];
    
    // Check if this looks like a prospect entry (numbered item followed by Address/Phone/Email/Website)
    const firstLineMatch = lines[i].match(/^(\d+)\.\s+(.+)$/);
    if (!firstLineMatch) return null;
    
    // Check if next few lines contain Address/Phone/Email/Website
    let hasProspectFields = false;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const nextLine = lines[j];
      if (nextLine.match(/^(Address|Phone|Email|Website):/i)) {
        hasProspectFields = true;
        break;
      }
      // If we hit another numbered item, stop
      if (nextLine.match(/^\d+\.\s+/)) break;
    }
    
    if (!hasProspectFields) return null;
    
    // Collect all prospect entries
    while (i < lines.length) {
      const line = lines[i];
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
      
      if (numberedMatch) {
        // Start new prospect
        const prospect = {
          number: numberedMatch[1],
          name: numberedMatch[2].trim(),
          address: '',
          phone: '',
          email: '',
          website: ''
        };
        
        i++;
        // Collect fields for this prospect
        while (i < lines.length) {
          const fieldLine = lines[i];
          
          // Stop if we hit another numbered prospect
          if (fieldLine.match(/^\d+\.\s+/)) {
            break;
          }
          
          // Stop if we hit a category header (all caps with / or multiple words)
          if (fieldLine.match(/^[A-Z][A-Z\s&/()\-]+$/) && fieldLine.length > 5 && i > startIndex + 2) {
            break;
          }
          
          // Stop if we hit a section separator
          if (fieldLine.match(/^=+$/) || fieldLine.match(/^-+$/)) {
            break;
          }
          
          // Stop if we hit a header with colon
          if (fieldLine.match(/^[A-Z][A-Z\s&/()\-:]+:$/) && i > startIndex + 2) {
            break;
          }
          
          // Parse fields
          const addressMatch = fieldLine.match(/^Address:\s*(.+)$/i);
          const phoneMatch = fieldLine.match(/^Phone:\s*(.+)$/i);
          const emailMatch = fieldLine.match(/^Email:\s*(.+)$/i);
          const websiteMatch = fieldLine.match(/^Website:\s*(.+)$/i);
          
          if (addressMatch) prospect.address = addressMatch[1].trim();
          else if (phoneMatch) prospect.phone = phoneMatch[1].trim();
          else if (emailMatch) prospect.email = emailMatch[1].trim();
          else if (websiteMatch) prospect.website = websiteMatch[1].trim();
          else if (!fieldLine.trim()) {
            // Empty line might signal end of prospect
            i++;
            break;
          }
          
          i++;
          
          // Stop after reasonable number of fields
          if (i - startIndex > 100) break;
        }
        
        prospects.push(prospect);
        
        // If we didn't advance, break to avoid infinite loop
        if (i <= startIndex) break;
      } else {
        // Check if this is a category header (like "VINEYARD/WINERY")
        if (line.match(/^[A-Z][A-Z\s&/()\-]+$/) && line.length > 5) {
          // Skip category header and continue
          i++;
          continue;
        }
        // Not a prospect entry, stop collecting
        break;
      }
    }
    
    if (prospects.length === 0) return null;
    
    return {
      type: 'prospectTable',
      prospects: prospects,
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
   * Replace emojis with Font Awesome icons
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
    
    let result = text;
    for (const [emoji, icon] of Object.entries(emojiMap)) {
      result = result.replace(new RegExp(emoji, 'g'), icon);
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
   * Check if text mentions a product that should have an image
   */
  _getImageForContent(text) {
    if (!text) return null;
    const lowerText = text.toLowerCase();
    
    // Check each image mapping
    for (const [key, imageData] of Object.entries(this.imageMap)) {
      if (lowerText.includes(key) && !this.addedImages.has(key)) {
        return { key, ...imageData };
      }
    }
    return null;
  }

  /**
   * Render an image based on image data
   */
  _renderImage(imageData, wrapClass = '') {
    if (!imageData) return '';
    
    const wrapper = wrapClass ? `<div class="${wrapClass}">` : '';
    const wrapperClose = wrapClass ? '</div>' : '';
    
    return `${wrapper}
<div class="image-container ${imageData.class}">
  <img src="${imageData.image}" alt="${imageData.alt}" />
  <div class="image-caption">${imageData.caption}</div>
</div>${wrapperClose}`;
  }

  /**
   * Convert parsed structure to HTML
   */
  toHTML(parsed) {
    let html = '';
    
    // Reset added images for this render
    this.addedImages.clear();

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
      let inProductSection = false;
      section.content.forEach((item, idx) => {
        const rendered = this._renderContentItem(item);
        
        // Check if this item starts a product section
        if (item.type === 'paragraph') {
          const productKey = this._isProductSectionStart(item.content);
          if (productKey && !inProductSection) {
            inProductSection = true;
          }
        }
        
        html += rendered;
        
        // Close product section if we hit the next product or end of section content
        if (inProductSection) {
          const nextItem = section.content[idx + 1];
          if (!nextItem || (nextItem.type === 'paragraph' && this._isProductSectionStart(nextItem.content))) {
            html += '</div>\n';
            inProductSection = false;
          }
        }
      });
      
      // Close product section if still open
      if (inProductSection) {
        html += '</div>\n';
      }

      // Subsections
      section.subsections.forEach(subsection => {
        const isGeoScope = subsection.title.toLowerCase().includes('geographic scope');
        const isCommonCropChallenges = subsection.title.toLowerCase().includes('common crop challenges');
        const isCropFocus = subsection.title.toLowerCase().includes('crop focus');
        
        // Check if subsection title mentions a product
        const titleImage = this._getImageForContent(subsection.title);
        const isProductSection = titleImage && titleImage.class === 'product-image';

        html += `<h3>${section.number}.${subsection.number} ${this._escapeHtml(subsection.title)}</h3>\n`;
        
        if (isGeoScope) {
          html += '<div class="geo-scope-wrap">';
        }

        if (isCommonCropChallenges) {
          html += '<div class="crop-challenges-wrap">';
        }

        // Wrap product sections for proper layout
        if (isProductSection) {
          html += '<div class="product-section">';
          // Add product image at the start
          html += this._renderImage(titleImage);
          this.addedImages.add(titleImage.key);
        }

        let inProductSection = false;
        subsection.content.forEach((item, idx) => {
          const rendered = this._renderContentItem(item);
          
          // Check if this item starts a product section
          if (item.type === 'paragraph') {
            const productKey = this._isProductSectionStart(item.content);
            if (productKey && !inProductSection) {
              inProductSection = true;
            }
          }
          
          html += rendered;
          
          // Close product section if we hit the next product or end of subsection
          if (inProductSection) {
            const nextItem = subsection.content[idx + 1];
            if (!nextItem || (nextItem.type === 'paragraph' && this._isProductSectionStart(nextItem.content))) {
              html += '</div>\n';
              inProductSection = false;
            }
          }
        });
        
        // Close product section if still open
        if (inProductSection) {
          html += '</div>\n';
        }

        if (isCropFocus) {
          const cropFocusImage = this.imageMap['crop focus'];
          html += this._renderImage(cropFocusImage);
          this.addedImages.add('crop focus');
        }

        if (isGeoScope) {
          html += this._renderGeographicScopeImage();
          html += '</div>';
          this.addedImages.add('geographic scope');
        }

        if (isCommonCropChallenges) {
          html += this._renderOrchardCompactionImage();
          html += '</div>';
          this.addedImages.add('common crop challenges');
        }
        
        // Close product section wrapper
        if (isProductSection) {
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
      (section) => !/marketing\/sales pipeline overview/i.test(section.title || '')
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
   * Render the orchard soil compaction image for Common Crop Challenges section
   */
  _renderOrchardCompactionImage() {
    return `
<div class="image-container crop-challenges-image">
  <img src="assets/orchard soil compaction.png" alt="Orchard soil compaction" />
  <div class="image-caption">Orchard soil compaction</div>
</div>
`;
  }

  /**
   * Render the crop focus image for Crop Focus section
   */
  _renderCropFocusImage() {
    return `
<div class="image-container crop-focus-image">
  <img src="assets/Crop focus.png" alt="Crop Focus" />
  <div class="image-caption">Crop Focus</div>
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
   * Make product names bold in text
   */
  _boldProductNames(text) {
    if (!text) return text;
    let result = text;
    
    // Product names to make bold
    const products = [
      { name: 'Pomona', variants: ['Pomona', 'POMONA', 'pomona'] },
      { name: 'Seriokai', variants: ['Seriokai\'s Secret', 'SERIKAI\'S SECRET', 'Seriokai', 'SERIKAI', 'seriokai'] },
      { name: 'Bucchas', variants: ['Bucchas', 'BUCCHAS', 'bucchas', 'Bacchus', 'BACCHUS', 'bacchus'] }
    ];
    
    products.forEach(product => {
      product.variants.forEach(variant => {
        // Only bold if not already in a tag
        const regex = new RegExp(`(?!<[^>]*>)\\b(${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b(?![^<]*>)`, 'gi');
        result = result.replace(regex, '<strong>$1</strong>');
      });
    });
    
    return result;
  }

  /**
   * Check if paragraph starts a product section
   */
  _isProductSectionStart(content) {
    if (!content) return null;
    const lowerContent = content.toLowerCase();
    
    // Check for product section patterns - more flexible matching
    if (lowerContent.includes('pomona blend') || (lowerContent.match(/^\d+\.\s*pomona/i) && lowerContent.includes('orchards'))) {
      return 'pomona';
    }
    if (lowerContent.includes('serikai') || (lowerContent.match(/^\d+\.\s*serikai/i) && (lowerContent.includes('avocados') || lowerContent.includes('citrus')))) {
      return 'seriokai';
    }
    if (lowerContent.includes('bucchas blend') || lowerContent.includes('bacchus') || (lowerContent.match(/^\d+\.\s*(bucchas|bacchus)/i) && lowerContent.includes('vineyards'))) {
      return 'bucchas';
    }
    
    return null;
  }

  /**
   * Convert URLs in text to clickable links
   */
  _linkifyUrls(text) {
    if (!text) return text;
    // Match URLs (http://, https://, www.)
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
      const href = url.startsWith('http') ? url : `https://${url}`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  }

  /**
   * Render prospect table to HTML
   */
  _renderProspectTable(prospects) {
    if (!prospects || prospects.length === 0) return '';
    
    let html = '<div class="prospect-table-container">\n';
    html += '<table class="prospect-table">\n';
    html += '<thead>\n';
    html += '<tr>\n';
    html += '<th>#</th>\n';
    html += '<th>Name</th>\n';
    html += '<th>Address</th>\n';
    html += '<th>Phone</th>\n';
    html += '<th>Email</th>\n';
    html += '<th>Website</th>\n';
    html += '</tr>\n';
    html += '</thead>\n';
    html += '<tbody>\n';
    
    prospects.forEach(prospect => {
      html += '<tr>\n';
      html += `<td>${this._escapeHtml(prospect.number)}</td>\n`;
      html += `<td><strong>${this._escapeHtml(prospect.name)}</strong></td>\n`;
      html += `<td>${this._escapeHtml(prospect.address)}</td>\n`;
      html += `<td>${prospect.phone ? this._linkifyUrls(this._escapeHtml(prospect.phone)) : ''}</td>\n`;
      html += `<td>${prospect.email ? this._linkifyUrls(this._escapeHtml(prospect.email)) : ''}</td>\n`;
      html += `<td>${prospect.website ? this._linkifyUrls(this._escapeHtml(prospect.website)) : ''}</td>\n`;
      html += '</tr>\n';
    });
    
    html += '</tbody>\n';
    html += '</table>\n';
    html += '</div>\n';
    
    return html;
  }

  /**
   * Render email template to HTML
   */
  _renderEmailBox(emailData) {
    let html = '<div class="email-example">\n';
    html += '<div class="email-header">\n';
    
    if (emailData.subject) {
      html += `<div class="field"><span class="field-label">Subject:</span> ${this._escapeHtml(emailData.subject)}</div>\n`;
    }
    if (emailData.from) {
      html += `<div class="field"><span class="field-label">From:</span> ${this._escapeHtml(emailData.from)}</div>\n`;
    }
    if (emailData.to) {
      html += `<div class="field"><span class="field-label">To:</span> ${this._escapeHtml(emailData.to)}</div>\n`;
    }
    
    html += '</div>\n';
    html += '<div class="email-body">\n';
    
    emailData.body.forEach(line => {
      if (line.trim()) {
        html += `<p>${this._escapeHtml(line.trim())}</p>\n`;
      } else {
        html += '<br />\n';
      }
    });
    
    html += '</div>\n';
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
        const boldContent = this._boldProductNames(item.content);
        const linkedContent = this._linkifyUrls(boldContent);
        const productKey = this._isProductSectionStart(item.content);
        
        // If this paragraph starts a product section, wrap it with image
        if (productKey && this.imageMap[productKey] && !this.addedImages.has(productKey)) {
          const imageData = this.imageMap[productKey];
          this.addedImages.add(productKey);
          return `<div class="product-section">
<div class="image-container ${imageData.class}">
  <img src="${imageData.image}" alt="${imageData.alt}" />
  <div class="image-caption">${imageData.caption}</div>
</div>
<p>${linkedContent}</p>\n`;
        }
        return `<p>${linkedContent}</p>\n`;
      
      case 'list':
        const tag = item.numbered ? 'ol' : 'ul';
        const items = item.items.map(listItem => {
          const boldItem = this._boldProductNames(listItem);
          return `<li>${boldItem}</li>\n`;
        }).join('');
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
      
      case 'prospectTable':
        return this._renderProspectTable(item.prospects);
      
      case 'image':
        const imagePath = item.content;
        const imageName = imagePath.split('/').pop().replace(/\.[^/.]+$/, '');
        return `<div class="image-container">
  <img src="${imagePath}" alt="${imageName}" />
</div>\n`;

      case 'fullpageImage':
        const fpImagePath = item.content;
        const fpImageName = fpImagePath.split('/').pop().replace(/\.[^/.]+$/, '');
        return `<div class="full-page-image-container">
  <img src="${fpImagePath}" alt="${fpImageName}" />
</div>\n`;

      case 'email':
        return this._renderEmailBox(item.emailData);

      case 'hookPoint':
        return `<div class="hook-point-box">
  <div class="hook-point-content">${this._escapeHtml(item.content)}</div>
</div>\n`;

      case 'example':
        let exampleContent = `<div class="example-box">\n`;
        item.content.forEach(subItem => {
          exampleContent += this._renderContentItem(subItem);
        });
        exampleContent += `</div>\n`;
        return exampleContent;

      case 'emphasisTitle':
        return `<div class="emphasis-title">${item.content}</div>\n`;
      
      default:
        return '';
    }
  }
}

module.exports = PlaybookParser;
