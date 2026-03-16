// Partners Carousel Script
(async function() {
    if (window.partnersCarouselLoaded) {
        console.warn('Partners carousel script already executed, skipping...');
        return;
    }
    window.partnersCarouselLoaded = true;
    
    console.log('Loading partners carousel...');
    
    // Define partner data with images from the Partners folder
    const partners = [
        { name: 'Amazon', logo: './assets/uploads/images/Partners/Amazon-Logo-2000.png', url: 'https://amazon.com' },
        { name: 'Braun', logo: './assets/uploads/images/Partners/Braun-logo.png', url: 'https://braun.com' },
        { name: 'H&M', logo: './assets/uploads/images/Partners/H&M-Logo.svg.png', url: 'https://hm.com' },
        { name: 'HALSTON', logo: './assets/uploads/images/Partners/HALSTON_logo.png', url: 'https://halston.com' },
        { name: 'IKEA', logo: './assets/uploads/images/Partners/Ikea_logo.svg.png', url: 'https://ikea.com' },
        { name: 'Laurastar', logo: './assets/uploads/images/Partners/Laurastar.webp', url: 'https://laurastar.com' },
        { name: 'Rolex', logo: './assets/uploads/images/Partners/Logo_da_Rolex.png', url: 'https://rolex.com' },
        { name: 'Nike', logo: './assets/uploads/images/Partners/Logo_NIKE.svg', url: 'https://nike.com' },
        { name: 'Mephisto', logo: './assets/uploads/images/Partners/mephisto.png', url: 'https://mephisto.com' },
        { name: 'Movado', logo: './assets/uploads/images/Partners/Movado-Logo.png', url: 'https://movado.com' },
        { name: 'Nordstrom', logo: './assets/uploads/images/Partners/nordstrom.png', url: 'https://nordstrom.com' },
        { name: 'Omega', logo: './assets/uploads/images/Partners/Omega_Logo.svg', url: 'https://omegawatches.com' },
        { name: 'Philips', logo: './assets/uploads/images/Partners/Philips - logo (removeBG).png', url: 'https://philips.com' },
        { name: 'Senreve', logo: './assets/uploads/images/Partners/senreve.png', url: 'https://senreve.com' },
        { name: 'Vevor', logo: './assets/uploads/images/Partners/vevor.png', url: 'https://vevor.com' },
        { name: 'Vortex', logo: './assets/uploads/images/Partners/Vortex-Logo.png', url: 'https://vortexoptics.com' },
        { name: 'YoLink', logo: './assets/uploads/images/Partners/YOLINK_CIRCLE.webp', url: 'https://yolink.com' },
        { name: 'Entryway', logo: './assets/uploads/images/Partners/Entryway-white.png', url: 'https://entryway.com' }
    ];

    const carousel = document.getElementById('partners-carousel');
    if (!carousel) {
        console.error('Partners carousel container not found');
        return;
    }
    
    console.log('Current partners carousel HTML before clearing:', carousel.innerHTML.length > 0 ? 'Has content' : 'Empty');
    
    // Clear existing content
    carousel.innerHTML = '';
    
    console.log('Partners carousel cleared, starting to render partners...');
    
    // Function to create a partner card
    function createPartnerCard(partner, index, isClone = false) {
        const card = document.createElement('div');
        card.className = `partner-card ${isClone ? 'clone' : 'original'}`;
        card.setAttribute('data-partner-name', partner.name);
        card.style.cursor = 'pointer';
        
        // Add click handler to open partner website
        card.addEventListener('click', () => {
            window.open(partner.url, '_blank');
        });
        
        card.innerHTML = `
            <img src="${partner.logo}" alt="${partner.name}" loading="lazy">
        `;
        
        return card;
    }
    
    // Add original items first
    partners.forEach((partner, index) => {
        console.log(`Rendering partner ${index + 1}: ${partner.name}`);
        const card = createPartnerCard(partner, index, false);
        carousel.appendChild(card);
    });
    
    // Add clones for seamless loop
    partners.forEach((partner, index) => {
        console.log(`Rendering partner clone ${index + 1}: ${partner.name}`);
        const card = createPartnerCard(partner, index, true);
        carousel.appendChild(card);
    });
    
    console.log('Partners carousel rendered successfully');
    console.log('Final partners carousel children count:', carousel.children.length);
    
    // Calculate animation duration based on number of partners
    const partnerCardWidth = 212; // 180px + 32px gap
    const totalWidth = partners.length * partnerCardWidth;
    const animationDuration = Math.max(20, totalWidth / 40); // Slower than products
    
    // Apply the calculated animation duration
    carousel.style.animationDuration = `${animationDuration}s`;
    console.log(`Partners animation duration set to: ${animationDuration}s for ${partners.length} partners`);
})();
