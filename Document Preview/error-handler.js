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

        let element;
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

        let exportBtn;
        let navSidebar;
        let originalStyles = {};
        let pages = [];
        let pageStyleCache = [];

        const restoreStyles = () => {
            if (pages.length && pageStyleCache.length) {
                pages.forEach((page, index) => {
                    page.style.boxShadow = pageStyleCache[index].boxShadow || '';
                    page.style.overflow = pageStyleCache[index].overflow || '';
                });
            }

            if (exportBtn) exportBtn.style.display = originalStyles.btnDisplay;
            if (navSidebar) navSidebar.style.display = originalStyles.navDisplay;
            if (typeof originalStyles.bodyBg !== 'undefined') {
                document.body.style.background = originalStyles.bodyBg;
            }
        };

        try {
            element = document.getElementById('document-content');
            
            if (!element) {
                throw new Error('Document content element not found');
            }
            
            // Validate element has content
            if (element.offsetHeight === 0 || element.offsetWidth === 0) {
                throw new Error('Document content has no dimensions');
            }

            // Ensure the PDF helpers exist (try CDN fallback if needed)
            if (!window.html2canvas) {
                await ScriptLoader.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
            }
            let jsPDFConstructor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
            if (!jsPDFConstructor) {
                await ScriptLoader.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                jsPDFConstructor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
            }
            if (!window.html2canvas) {
                throw new Error('html2canvas is not available on the page');
            }
            if (!jsPDFConstructor) {
                throw new Error('jsPDF is not available on the page');
            }

            // Wait for images to load
            await Promise.all(Array.from(document.querySelectorAll('img')).map(waitForImage));

            // Keep everything in view for consistent rendering
            window.scrollTo(0, 0);

            // Hide UI elements
            exportBtn = document.querySelector('.pdf-export-btn');
            navSidebar = document.querySelector('.nav-sidebar');
            originalStyles = {
                btnDisplay: exportBtn ? exportBtn.style.display : '',
                navDisplay: navSidebar ? navSidebar.style.display : '',
                bodyBg: document.body.style.background
            };
            
            if (exportBtn) exportBtn.style.display = 'none';
            if (navSidebar) navSidebar.style.display = 'none';

            // Set white background for PDF
            document.body.style.background = '#ffffff';
            
            // Force reflow
            void element.offsetHeight;
            
            // Adjust page styling for better rendering
            pages = Array.from(element.querySelectorAll('.page'));
            if (!pages.length) {
                throw new Error('No pages found for export');
            }
            pageStyleCache = pages.map((page) => ({
                boxShadow: page.style.boxShadow,
                overflow: page.style.overflow
            }));
            pages.forEach((page) => {
                page.style.boxShadow = 'none';
                page.style.overflow = 'visible';
            });

            const pdf = new jsPDFConstructor({ 
                unit: 'pt', 
                format: 'letter', 
                orientation: 'portrait',
                compress: true
            });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 24; // ~0.33in margin to avoid clipping

            for (let i = 0; i < pages.length; i++) {
                btn.textContent = `⏳ Rendering page ${i + 1} of ${pages.length}...`;

                const canvas = await window.html2canvas(pages[i], { 
                    scale: 2,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: '#ffffff',
                    logging: false,
                    scrollX: -window.scrollX,
                    scrollY: -window.scrollY,
                    windowWidth: Math.max(document.documentElement.clientWidth, pages[i].offsetWidth),
                    windowHeight: Math.max(document.documentElement.clientHeight, pages[i].offsetHeight)
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.98);
                const availableWidth = pageWidth - margin * 2;
                const availableHeight = pageHeight - margin * 2;

                let renderWidth = availableWidth;
                let renderHeight = (canvas.height * renderWidth) / canvas.width;

                if (renderHeight > availableHeight) {
                    renderHeight = availableHeight;
                    renderWidth = (canvas.width * renderHeight) / canvas.height;
                }

                const offsetX = (pageWidth - renderWidth) / 2;
                const offsetY = (pageHeight - renderHeight) / 2;

                pdf.addImage(imgData, 'JPEG', offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST');

                if (i < pages.length - 1) {
                    pdf.addPage('letter', 'portrait');
                }
            }

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
