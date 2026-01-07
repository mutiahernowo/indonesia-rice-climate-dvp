// Scroll detection
function initScrollDetection() {
    const chapters = document.querySelectorAll('.chapter');
    
    // Intersection Observer for scroll detection
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Chapter is visible
                const chapterId = entry.target.id;
                activateChapter(chapterId);
            }
        });
    }, {
        threshold: 0.6
    });
    
    // Observe all chapters
    chapters.forEach(chapter => {
        observer.observe(chapter);
    });
}

// Active chapter
function activateChapter(chapterId) {
    console.log('Chapter active: ', chapterId);

    if(!sticky_on_scroll)
        hideTooltip();

    // Remove active class from all
    document.querySelectorAll('.chapter').forEach(ch => {
        ch.classList.remove('active');
    });
    // Add active to current
    document.getElementById(chapterId).classList.add('active');

    
    // Update map based on chapter
    switch(chapterId) {
        case 'chapter-0': // Intro
            currentYear = 2019;
            break;
        case 'chapter-1': // 2019
            currentYear = 2019;
            break;
        case 'chapter-2': // 2020
            currentYear = 2020;
            break;
        case 'chapter-3': // 2021
            currentYear = 2021;
            break;
        case 'chapter-4': // 2022
            currentYear = 2022;
            break;
        case 'chapter-5': // 2023
            currentYear = 2023;
            break;
        case 'chapter-6': // 2024
            currentYear = 2024;
            break;
    }

    // update map
    updateMap();

    // update slider
    document.getElementById('year-value').textContent = currentYear;
    // document.querySelector(`input[value="${currentMetric}"]`).checked = true;
}

window.dispatchEvent(new CustomEvent('yearfocus', { detail: { year: currentYear } }));