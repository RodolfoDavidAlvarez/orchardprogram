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

    // Enhanced PDF export with better error handling
    window.enhancedPDFExport = function() {
        const btn = document.querySelector('.pdf-export-btn');
        if (!btn) {
            console.error('Export button not found');
            return;
        }

        const originalText = btn.textContent;
        
        btn.classList.add('exporting');
        btn.textContent = '⏳ Generating PDF...';
        btn.disabled = true;

        try {
            const element = document.getElementById('document-content');
            
            if (!element) {
                throw new Error('Document content element not found');
            }
            
            // Validate element has content
            if (element.offsetHeight === 0 || element.offsetWidth === 0) {
                throw new Error('Document content has no dimensions');
            }

            // Wait for images to load
            const images = document.querySelectorAll('img');
            const imagePromises = Array.from(images).map(img => {
                if (img.complete) {
                    return Promise.resolve();
                }
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve; // Continue even if image fails
                    setTimeout(resolve, 3000); // Timeout after 3 seconds
                });
            });

            Promise.all(imagePromises)
                .then(() => {
                    // Hide UI elements
                    const exportBtn = document.querySelector('.pdf-export-btn');
                    const navSidebar = document.querySelector('.nav-sidebar');
                    const originalBtnDisplay = exportBtn ? exportBtn.style.display : '';
                    const originalNavDisplay = navSidebar ? navSidebar.style.display : '';
                    
                    if (exportBtn) exportBtn.style.display = 'none';
                    if (navSidebar) navSidebar.style.display = 'none';

                    // Set white background for PDF
                    const originalBodyBg = document.body.style.background;
                    document.body.style.background = '#ffffff';
                    
                    // Force reflow
                    void element.offsetHeight;
                    
                    // Adjust page overflow for better rendering
                    const pages = element.querySelectorAll('.page');
                    const originalOverflows = [];
                    pages.forEach((page, index) => {
                        originalOverflows[index] = page.style.overflow;
                        page.style.overflow = 'visible';
                    });

                    const opt = {
                        margin: [0, 0, 0, 0],
                        filename: 'Orchards_Program_Execution_Playbook.pdf',
                        image: { type: 'jpeg', quality: 0.95 },
                        html2canvas: { 
                            scale: 2,
                            useCORS: true,
                            letterRendering: true,
                            logging: false,
                            backgroundColor: '#ffffff',
                            removeContainer: false,
                            windowWidth: 816,
                            windowHeight: 1056
                        },
                        jsPDF: { 
                            unit: 'in', 
                            format: 'letter', 
                            orientation: 'portrait',
                            compress: true
                        },
                        pagebreak: { 
                            mode: ['avoid-all', 'css', 'legacy'],
                            avoid: ['.page', 'h1', 'h2', 'h3', 'h4', '.key-points']
                        }
                    };

                    const restoreStyles = () => {
                        pages.forEach((page, index) => {
                            page.style.overflow = originalOverflows[index] || '';
                        });
                        if (exportBtn) exportBtn.style.display = originalBtnDisplay;
                        if (navSidebar) navSidebar.style.display = originalNavDisplay;
                        document.body.style.background = originalBodyBg;
                    };

                    html2pdf().set(opt).from(element).save()
                        .then(() => {
                            restoreStyles();
                            btn.classList.remove('exporting');
                            btn.textContent = '✅ PDF Exported!';
                            btn.disabled = false;
                            setTimeout(() => {
                                btn.textContent = originalText;
                            }, 2000);
                        })
                        .catch((error) => {
                            ErrorLogger.log(error, {
                                elementDimensions: {
                                    width: element.offsetWidth,
                                    height: element.offsetHeight,
                                    scrollWidth: element.scrollWidth,
                                    scrollHeight: element.scrollHeight
                                }
                            });
                            
                            restoreStyles();
                            btn.classList.remove('exporting');
                            btn.textContent = '❌ Export Failed - Check Console';
                            btn.disabled = false;
                            setTimeout(() => {
                                btn.textContent = originalText;
                            }, 3000);
                        });
                })
                .catch((error) => {
                    ErrorLogger.log(error, { phase: 'image-loading' });
                    btn.classList.remove('exporting');
                    btn.textContent = '❌ Error Loading Images';
                    btn.disabled = false;
                    setTimeout(() => {
                        btn.textContent = originalText;
                    }, 3000);
                });
        } catch (error) {
            ErrorLogger.log(error, { phase: 'initialization' });
            btn.classList.remove('exporting');
            btn.textContent = '❌ Error - Try Again';
            btn.disabled = false;
            setTimeout(() => {
                btn.textContent = originalText;
            }, 3000);
        }
    };

    // Export error logger for global access
    window.ErrorLogger = ErrorLogger;
})();

