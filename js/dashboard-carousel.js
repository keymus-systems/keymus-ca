// Product Carousel Script
(async function() {
    // Check if carousel has already been loaded to prevent duplicate execution
    if (window.carouselLoaded) {
        console.warn('Carousel script already executed, skipping...');
        return;
    }
    window.carouselLoaded = true;
    
    console.log('Loading product carousel...');
    
    let products = [];
    try {
        // Use public endpoint that doesn't require authentication
        const response = await fetch('/api/products/carousel');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Carousel API response:', data);
        console.log('Number of products received:', data.products?.length || 0);
        
        if (!data.success || !Array.isArray(data.products)) {
            throw new Error('Invalid products response');
        }
        
        products = data.products;
        
        // Log product IDs to check for duplicates
        const productIds = products.map(p => p.id);
        console.log('Product IDs received:', productIds);
        const uniqueIds = [...new Set(productIds)];
        console.log('Unique product IDs:', uniqueIds);
        if (productIds.length !== uniqueIds.length) {
            console.warn('DUPLICATE PRODUCTS DETECTED IN API RESPONSE!');
            console.log('Original count:', productIds.length, 'Unique count:', uniqueIds.length);
        }
        
        // Remove duplicates by name AND price (since same product can have different IDs)
        const uniqueProducts = [];
        const seenProducts = new Set();
        
        for (const product of products) {
            // Create a unique key based on name and price
            const productKey = `${product.name?.toLowerCase().trim()}_${product.price}`;
            
            if (!seenProducts.has(productKey)) {
                seenProducts.add(productKey);
                uniqueProducts.push(product);
            } else {
                console.log(`Skipping duplicate product: ${product.name} (ID: ${product.id})`);
            }
        }
        
        if (products.length !== uniqueProducts.length) {
            console.log(`Removed ${products.length - uniqueProducts.length} duplicate products`);
            console.log('Original count:', products.length, 'After deduplication:', uniqueProducts.length);
        }
        
        products = uniqueProducts;
        
    } catch (e) {
        console.error('Failed to load products from /api/products/carousel', e);
        document.getElementById('product-carousel-container').style.display = 'none';
        return;
    }

    // Products are already filtered for price > 5000 by the backend
    const highValue = products;

    if (!highValue.length) {
        console.log('No high-value products found');
        document.getElementById('product-carousel-container').style.display = 'none';
        return;
    }
    
    console.log(`Rendering ${highValue.length} products in carousel`);
    // Render product cards with duplication for seamless loop
    const carousel = document.getElementById('product-carousel');
    if (!carousel) {
        console.error('Carousel container not found');
        return;
    }
    
    console.log('Current carousel HTML before clearing:', carousel.innerHTML.length > 0 ? 'Has content' : 'Empty');
    
    // Clear existing products to prevent duplication
    carousel.innerHTML = '';
    
    console.log('Carousel cleared, starting to render products...');
    
    // Function to create a product card
    function createProductCard(product, index, isClone = false) {
        const price = parseFloat(product.price || 0);
        const commission = product.commission ? `$${parseFloat(product.commission).toFixed(2)}` : `$${(price * 0.10).toFixed(2)}`;
        const name = (product.name||'').split(' ').slice(0,5).join(' ');
        const imgSrc = product.image_url || '/assets/uploads/products/newegg-1.jpg';
        const card = document.createElement('div');
        card.className = `product-card ${isClone ? 'clone' : 'original'}`;
        card.setAttribute('data-product-id', product.id);
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            window.location.href = 'task.html';
        });
        card.innerHTML = `
            <span class="product-badge">Platinum</span>
            <img src="${imgSrc}" alt="${name}">
            <div class="product-name">${name}</div>
            <div class="product-price-btn">$${price.toLocaleString()}</div>
            <div class="product-commission-btn">Earn ${commission}</div>
        `;
        return card;
    }
    
    // Add original items first
    highValue.forEach((product, index) => {
        console.log(`Rendering product ${index + 1}: ${product.name} (ID: ${product.id})`);
        const card = createProductCard(product, index, false);
        carousel.appendChild(card);
    });
    
    // Add clones of all items for seamless loop (this creates the infinite effect)
    highValue.forEach((product, index) => {
        console.log(`Rendering clone ${index + 1}: ${product.name} (ID: ${product.id})`);
        const card = createProductCard(product, index, true);
        carousel.appendChild(card);
    });
    
    console.log('Carousel rendered successfully');
    console.log('Final carousel children count:', carousel.children.length);
    
    // Calculate the animation duration based on number of products for consistent speed
    const cardWidth = 244; // 220px + 24px gap
    const totalWidth = highValue.length * cardWidth;
    const animationDuration = Math.max(20, totalWidth / 30); // Adjust speed as needed
    
    // Apply the calculated animation duration
    carousel.style.animationDuration = `${animationDuration}s`;
    console.log(`Animation duration set to: ${animationDuration}s for ${highValue.length} products`);
    
    // Set initial position to start of original items (skip the cloned items at the beginning)
    const cloneCount = highValue.length; // Number of cloned items equals number of original items
    const initialOffset = cloneCount * cardWidth;
    carousel.scrollLeft = initialOffset;

    // Carousel scroll logic with infinite loop
    const scrollAmount = 260;
    const leftButton = document.getElementById('carousel-left');
    const rightButton = document.getElementById('carousel-right');
    
    // Calculate dimensions for infinite loop
    const totalOriginalWidth = highValue.length * cardWidth;
    const cloneWidth = cloneCount * cardWidth;
    
    // Function to handle infinite loop transitions
    function handleInfiniteLoop() {
        const scrollLeft = carousel.scrollLeft;
        const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
        
        console.log('Checking infinite loop:', { scrollLeft, maxScrollLeft, cloneWidth, totalOriginalWidth });
        
        // If we've scrolled past the end (into the cloned items at the end)
        if (scrollLeft >= maxScrollLeft - 20) { // Increased buffer for more reliable detection
            console.log('Jumping to start of original items');
            // Jump to the beginning of original items (skip clones at start)
            carousel.scrollLeft = cloneWidth;
        }
        // If we've scrolled before the beginning (into the cloned items at the start)
        else if (scrollLeft <= 20) { // Increased buffer
            console.log('Jumping to end of original items');
            // Jump to the end of original items (before clones at end)
            carousel.scrollLeft = cloneWidth + totalOriginalWidth - scrollAmount;
        }
    }
    
    if (leftButton && rightButton) {
        leftButton.onclick = () => {
            carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            // Check for infinite loop after scroll animation
            setTimeout(handleInfiniteLoop, 300);
        };
        rightButton.onclick = () => {
            carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            // Check for infinite loop after scroll animation
            setTimeout(handleInfiniteLoop, 300);
        };
        console.log('Carousel navigation buttons initialized');
        
        // Auto-rotation functionality with infinite loop
        let autoRotateInterval;
        const autoRotateDelay = 4000; // 4 seconds
        
        function startAutoRotate() {
            autoRotateInterval = setInterval(() => {
                carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                // Handle infinite loop after scroll
                setTimeout(handleInfiniteLoop, 300);
            }, autoRotateDelay);
        }
        
        function stopAutoRotate() {
            if (autoRotateInterval) {
                clearInterval(autoRotateInterval);
                autoRotateInterval = null;
            }
        }
        
        // Start auto-rotation
        startAutoRotate();
        
        // Add scroll event listener for continuous infinite loop handling
        let scrollTimeout;
        carousel.addEventListener('scroll', () => {
            // Handle infinite loop on manual scroll too
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(handleInfiniteLoop, 100); // Allow scroll to settle
            
            // Pause and restart auto-rotation
            stopAutoRotate();
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(startAutoRotate, 2000); // Resume after 2 seconds of inactivity
        });
        
        // Pause auto-rotation on hover
        carousel.addEventListener('mouseenter', stopAutoRotate);
        carousel.addEventListener('mouseleave', startAutoRotate);
        
        // Pause auto-rotation when navigation buttons are used
        leftButton.addEventListener('click', () => {
            stopAutoRotate();
            setTimeout(startAutoRotate, 2000);
        });
        
        rightButton.addEventListener('click', () => {
            stopAutoRotate();
            setTimeout(startAutoRotate, 2000);
        });
        
        console.log('Carousel auto-rotation initialized');
    } else {
        console.error('Carousel navigation buttons not found');
    }
})();
