// Enhanced error handling for PDF export
(function() {
    'use strict';

    // Error logging utility
    const ErrorLogger = {
        log: function(error, context) {
            const errorData = {
                timestamp: new Date().toISOString(),
                error: error.message || error,
                stack: error.stack,
                context: context || {},
                userAgent: navigator.userAgent,
                url: window.location.href
            };
            
            console.error('PDF Export Error:', errorData);
            
            // Send to server if available
            if (typeof fetch !== 'undefined') {
                fetch('/api/log-error', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(errorData)
                }).catch(err => console.warn('Failed to log error to server:', err));
            }
        }
    };

    // Lazy loader for external scripts if CDN fails to load in time
    const ScriptLoader = (() => {
        const cache = new Map();
        const loadScript = (src) => {
            if (cache.has(src)) {
                return cache.get(src);
            }
            const promise = new Promise((resolve, reject) => {
                const el = document.createElement('script');
                el.src = src;
                el.async = true;
                el.onload = () => resolve();
                el.onerror = () => reject(new Error(`Failed to load script: ${src}`));
                document.head.appendChild(el);
            });
            cache.set(src, promise);
            return promise;
        };
        return {
            loadScript
        };
    })();

    // Enhanced PDF export with better error handling
    window.enhancedPDFExport = async function() {
        const btn = document.querySelector('.pdf-export-btn');
        if (!btn) {
            console.error('Export button not found');
            return;
        }

        const originalText = btn.textContent;
        
        btn.classList.add('exporting');
        btn.textContent = '⏳ Preparing PDF...';
        btn.disabled = true;

        // Preload images to avoid blank placeholders
        const waitForImage = (img) => {
            if (img.complete && img.naturalWidth > 0) {
                return Promise.resolve();
            }
            return new Promise((resolve) => {
                const done = () => resolve();
                img.onload = done;
                img.onerror = done;
                setTimeout(done, 3000);
            });
        };

        const ensureLibraries = async () => {
            if (!window.html2canvas) {
                await ScriptLoader.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
            }
            if (!window.jspdf || !window.jspdf.jsPDF) {
                await ScriptLoader.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
            if (!window.html2pdf) {
                await ScriptLoader.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
            }
            if (!window.html2canvas) {
                throw new Error('html2canvas is not available on the page');
            }
            if (!window.html2pdf) {
                throw new Error('html2pdf is not available on the page');
            }
        };

        let exportBtn;
        let floatingToc;
        let searchToolbar;
        let searchShell;
        let originalStyles = {};
        let pages = [];
        let pageStyleCache = [];
        let element;

        const restoreStyles = () => {
            if (pages.length && pageStyleCache.length) {
                pages.forEach((page, index) => {
                    if (pageStyleCache[index]) {
                        page.style.boxShadow = pageStyleCache[index].boxShadow || '';
                        page.style.overflow = pageStyleCache[index].overflow || '';
                        page.style.height = pageStyleCache[index].height || '';
                        page.style.minHeight = pageStyleCache[index].minHeight || '';
                        page.style.maxHeight = pageStyleCache[index].maxHeight || '';
                        page.style.padding = pageStyleCache[index].padding || '';
                        page.style.margin = pageStyleCache[index].margin || '';
                    }
                });
            }

            if (exportBtn) exportBtn.style.display = originalStyles.btnDisplay;
            if (floatingToc) floatingToc.style.display = originalStyles.tocDisplay;
            if (searchToolbar) searchToolbar.style.display = originalStyles.searchToolbarDisplay;
            if (searchShell) searchShell.style.display = originalStyles.searchShellDisplay;
            if (typeof originalStyles.bodyBg !== 'undefined') {
                document.body.style.background = originalStyles.bodyBg;
            }
        };

        try {
            await ensureLibraries();

            element = document.getElementById('document-content');
            
            if (!element) {
                throw new Error('Document content element not found');
            }
            
            // Validate element has content
            if (element.offsetHeight === 0 || element.offsetWidth === 0) {
                throw new Error('Document content has no dimensions');
            }

            // Wait for images to load
            await Promise.all(Array.from(document.querySelectorAll('img')).map(waitForImage));

            // Small delay to ensure all content is fully rendered
            await new Promise(resolve => setTimeout(resolve, 300));

            // Keep everything in view for consistent rendering
            window.scrollTo(0, 0);
            element.scrollIntoView({ behavior: 'instant', block: 'start' });

            // Hide UI elements
            exportBtn = document.querySelector('.pdf-export-btn');
            floatingToc = document.querySelector('.floating-toc');
            searchToolbar = document.querySelector('.search-toolbar');
            searchShell = document.querySelector('.search-shell');
            originalStyles = {
                btnDisplay: exportBtn ? exportBtn.style.display : '',
                tocDisplay: floatingToc ? floatingToc.style.display : '',
                searchToolbarDisplay: searchToolbar ? searchToolbar.style.display : '',
                searchShellDisplay: searchShell ? searchShell.style.display : '',
                bodyBg: document.body.style.background
            };
            
            if (exportBtn) exportBtn.style.display = 'none';
            if (floatingToc) floatingToc.style.display = 'none';
            if (searchToolbar) searchToolbar.style.display = 'none';
            if (searchShell) searchShell.style.display = 'none';

            // Set white background for PDF
            document.body.style.background = '#ffffff';
            
            // Force reflow
            void element.offsetHeight;
            
            // Collect pages exactly as rendered (already split/numbered)
            pages = Array.from(element.querySelectorAll('.page'));
            if (!pages.length) {
                throw new Error('No pages found for export');
            }

            // Cache & smooth temporarily for capture
            pageStyleCache = pages.map((page) => ({
                boxShadow: page.style.boxShadow,
                overflow: page.style.overflow,
                height: page.style.height,
                minHeight: page.style.minHeight,
                maxHeight: page.style.maxHeight,
                padding: page.style.padding,
                margin: page.style.margin
            }));
            pages.forEach((page) => {
                page.style.boxShadow = 'none'; // remove shadow for clean PDF
                page.style.overflow = 'hidden'; // lock current layout
                // keep width/height as-is so PDF matches preview
            });

            // Render each page individually to preserve exact layout
            const jsPDF =
                (window.jspdf && window.jspdf.jsPDF) ||
                (window.jsPDF) ||
                null;
            if (!jsPDF) throw new Error('jsPDF not available after loading');
            const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait', compress: true });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            for (let i = 0; i < pages.length; i++) {
                btn.textContent = `⏳ Rendering page ${i + 1}/${pages.length}...`;

                // Ensure the page is in view for accurate render
                pages[i].scrollIntoView({ behavior: 'instant', block: 'start' });
                await new Promise(resolve => setTimeout(resolve, 50));

                const canvas = await html2canvas(pages[i], {
                    scale: 2,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: '#ffffff',
                    logging: false,
                    letterRendering: true,
                    scrollX: 0,
                    scrollY: -window.scrollY // neutralize scroll
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.98);
                if (i > 0) pdf.addPage('letter', 'portrait');
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }

            btn.textContent = '⬇︎ Downloading...';
            pdf.save('Orchards_Program_Execution_Playbook.pdf');

            restoreStyles();
            btn.classList.remove('exporting');
            btn.textContent = '✅ PDF Exported!';
            btn.disabled = false;
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        } catch (error) {
            ErrorLogger.log(error, { 
                phase: 'pdf-export',
                pageCount: pages.length,
                elementDimensions: element ? {
                    width: element.offsetWidth,
                    height: element.offsetHeight,
                    scrollWidth: element.scrollWidth,
                    scrollHeight: element.scrollHeight
                } : null
            });
            restoreStyles();
            btn.classList.remove('exporting');
            btn.textContent = '❌ Export Failed - Check Console';
            btn.disabled = false;
            setTimeout(() => {
                btn.textContent = originalText;
            }, 3000);
        }
    };

    // Export error logger for global access
    window.ErrorLogger = ErrorLogger;
})();
