// Product Tour Guide System
(function() {
    'use strict';

    // Tour configuration
    const tourSteps = [
        {
            target: '.province-list',
            title: 'Province Explorer',
            description: 'Click any province badge to zoom directly to that province on the map below! These are the top 10 rice-producing provinces in Indonesia. Try clicking one to see province-specific climate and productivity data.',
            position: 'bottom'
        },
        {
            target: '.trend-chart-container',
            title: 'National Trend Line',
            description: 'This line chart shows the 6-year trend (2019-2024) of the national average across top 10 provinces. Watch how it changes when you select different climate indicators! Hover over the dots to see exact values.',
            position: 'bottom'
        },
        {
            target: '#overview',
            title: 'Interactive Scatter Plot',
            description: 'This scatter plot shows the relationship between climate indicators and rice production for a specific year. Use the controls to explore different years and climate variables. Each dot represents a province.',
            position: 'bottom'
        },
        {
            target: '.sticky-panel',
            title: 'Year-by-Year Narrative',
            description: 'Scroll through these chapters to explore how climate patterns changed from 2019 to 2024. Each chapter highlights key findings and impacts on rice productivity. The map on the right updates as you scroll!',
            position: 'right'
        },
        {
            target: '.controls',
            title: 'Toggle Between Views',
            description: 'Switch between Climate indicators (temperature, rainfall, humidity) and Rice Productivity metrics (field productivity, yield area, production) to see different perspectives of the data.',
            position: 'bottom'
        },
        {
            target: '#map',
            title: 'Interactive Indonesia Map',
            description: 'This map visualizes climate and productivity data across Indonesia. Hover over provinces to see details, and click to view in-depth province-specific trends. The map updates as you scroll through the narrative!',
            position: 'left'
        }
    ];

    let currentStep = 0;
    let tourActive = false;

    // DOM elements
    const overlay = document.getElementById('tour-overlay');
    const tooltip = document.getElementById('tour-tooltip');
    const stepSpan = tooltip.querySelector('.tour-step');
    const titleElement = tooltip.querySelector('.tour-title');
    const descriptionElement = tooltip.querySelector('.tour-description');
    const prevButton = document.getElementById('tour-prev');
    const nextButton = document.getElementById('tour-next');
    const skipButton = document.getElementById('tour-skip');
    const arrow = tooltip.querySelector('.tour-arrow');

    // Check if tour has been completed before
    function shouldShowTour() {
        // Always show tour on first page load
        // After user clicks "Finish" or "Skip", it won't show again in that session
        try {
            // Check if tour was completed in this session
            if (window.sessionStorage && sessionStorage.getItem('tourCompletedThisSession')) {
                return false;
            }
            // For first visit or new session, always show
            return true;
        } catch (e) {
            // If storage not available, always show tour
            return true;
        }
    }

    // Start the tour
    function startTour() {
        if (!shouldShowTour()) {
            console.log('Tour already completed in this session.');
            return;
        }
        
        tourActive = true;
        currentStep = 0;
        overlay.classList.add('active');
        showStep(currentStep);
    }

    // Show a specific step
    function showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= tourSteps.length) return;

        const step = tourSteps[stepIndex];
        const targetElement = document.querySelector(step.target);

        if (!targetElement) {
            console.warn('Tour target not found:', step.target);
            return;
        }

        // Update content
        stepSpan.textContent = `${stepIndex + 1}/${tourSteps.length}`;
        titleElement.textContent = step.title;
        descriptionElement.textContent = step.description;

        // Update buttons
        prevButton.disabled = stepIndex === 0;
        nextButton.textContent = stepIndex === tourSteps.length - 1 ? 'Finish' : 'Next';

        // Remove previous highlight
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
        });

        // Highlight current target
        targetElement.classList.add('tour-highlight');

        // Position tooltip
        positionTooltip(targetElement, step.position);

        // Show tooltip
        tooltip.classList.remove('hidden');

        // Scroll target into view
        setTimeout(() => {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });

            setTimeout(() => {
                if (tourActive) {
                    positionTooltip(targetElement, step.position);
                }
            }, 300);
        }, 0);
    }

    // Position the tooltip relative to target
    function positionTooltip(target, position) {
        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const arrowSize = 10;
        const gap = 25;

        // Remove previous arrow position classes
        arrow.className = 'tour-arrow';

        let top, left;

        switch (position) {
            case 'top':
                top = targetRect.top - tooltipRect.height - gap;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                arrow.classList.add('bottom');
                break;

            case 'bottom':
                top = targetRect.bottom + gap;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                arrow.classList.add('top');
                break;

            case 'left':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.left - tooltipRect.width - gap;
                arrow.classList.add('right');
                break;

            case 'right':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.right + gap;
                arrow.classList.add('left');
                break;

            default:
                // Default to bottom
                top = targetRect.bottom + gap;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                arrow.classList.add('top');
        }

        // Ensure tooltip stays within viewport with better margins
        const margin = 20;
        const maxLeft = window.innerWidth - tooltipRect.width - margin;
        const maxTop = window.innerHeight - tooltipRect.height - margin;
        
        if (left < margin) left = margin;
        if (left > maxLeft) left = maxLeft;
        if (top < margin) top = margin;
        if (top > maxTop) top = maxTop;

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    // End the tour
    function endTour() {
        tourActive = false;
        overlay.classList.remove('active');
        tooltip.classList.add('hidden');
        
        // Remove all highlights and restore z-index
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
            el.style.position = '';
            el.style.zIndex = '';
        });

        // Mark tour as completed for this session only
        // It will show again when user refreshes the page
        try {
            if (window.sessionStorage) {
                sessionStorage.setItem('tourCompletedThisSession', 'true');
            }
        } catch (e) {
            console.warn('Could not save tour state');
        }
    }

    // Event listeners
    prevButton.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            showStep(currentStep);
        }
    });

    nextButton.addEventListener('click', () => {
        if (currentStep < tourSteps.length - 1) {
            currentStep++;
            showStep(currentStep);
        } else {
            endTour();
        }
    });

    skipButton.addEventListener('click', () => {
        endTour();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            endTour();
        }
    });

    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        if (!tourActive) return;
        
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            showStep(currentStep);
        }, 250);
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!tourActive) return;

        if (e.key === 'Escape') {
            endTour();
        } else if (e.key === 'ArrowLeft' && currentStep > 0) {
            currentStep--;
            showStep(currentStep);
        } else if (e.key === 'ArrowRight') {
            if (currentStep < tourSteps.length - 1) {
                currentStep++;
                showStep(currentStep);
            } else {
                endTour();
            }
        }
    });

    // Public API to restart tour
    window.restartTour = function() {
        try {
            if (window.sessionStorage) {
                sessionStorage.removeItem('tourCompletedThisSession');
            }
        } catch (e) {
            console.warn('Could not clear tour state');
        }
        startTour();
    };

    // Welcome Modal Handlers
    const welcomeModal = document.getElementById('welcome-modal');
    const startTourBtn = document.getElementById('start-tour-btn');
    const skipTourBtn = document.getElementById('skip-tour-btn');

    // Show welcome modal on page load
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (shouldShowTour() && welcomeModal) {
                welcomeModal.classList.remove('hidden');
            }
        }, 500);
    });

    // Also try if DOM is already loaded
    if (document.readyState === 'complete') {
        setTimeout(() => {
            if (shouldShowTour() && welcomeModal) {
                welcomeModal.classList.remove('hidden');
            }
        }, 500);
    }

    // Start tour button, hide modal and start tour
    if (startTourBtn) {
        startTourBtn.addEventListener('click', () => {
            welcomeModal.classList.add('hidden');
            setTimeout(() => {
                startTour();
            }, 300);
        });
    }

    // Skip tour button, just hide modal
    if (skipTourBtn) {
        skipTourBtn.addEventListener('click', () => {
            welcomeModal.classList.add('hidden');
            // Mark as completed so it doesn't show again
            try {
                if (window.sessionStorage) {
                    sessionStorage.setItem('tourCompletedThisSession', 'true');
                }
            } catch (e) {
                console.warn('Could not save tour state');
            }
        });
    }

})();
