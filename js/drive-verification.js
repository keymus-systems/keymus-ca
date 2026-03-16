/**
 * Drive Unified System Verification Script
 * Run this in the browser console to verify the cleanup is working
 */

function verifyDriveUnifiedSystem() {
    console.log('🔍 Verifying Drive Unified System...');
    
    const results = {
        cssLoaded: false,
        jsLoaded: false,
        rendererAvailable: false,
        conflictsResolved: false,
        errors: []
    };

    // Check if unified CSS is loaded
    try {
        const stylesheets = Array.from(document.styleSheets);
        results.cssLoaded = stylesheets.some(sheet => 
            sheet.href && sheet.href.includes('drive-unified-styles.css')
        );
        
        if (results.cssLoaded) {
            console.log('✅ Drive unified CSS loaded');
        } else {
            console.log('❌ Drive unified CSS not loaded');
            results.errors.push('drive-unified-styles.css not found');
        }
    } catch (error) {
        results.errors.push(`CSS check failed: ${error.message}`);
    }

    // Check if unified JS renderer is loaded
    try {
        results.rendererAvailable = typeof window.renderDriveProductCard === 'function';
        
        if (results.rendererAvailable) {
            console.log('✅ Drive unified renderer available');
        } else {
            console.log('❌ Drive unified renderer not available');
            results.errors.push('renderDriveProductCard function not found');
        }
    } catch (error) {
        results.errors.push(`JS check failed: ${error.message}`);
    }

    // Check if original renderProductCard is properly overridden
    try {
        if (typeof window.renderProductCard === 'function') {
            // Try to identify if it's the unified version
            const funcString = window.renderProductCard.toString();
            results.jsLoaded = funcString.includes('renderDriveProductCard') || 
                              funcString.includes('drive-product-container');
            
            if (results.jsLoaded) {
                console.log('✅ Unified renderer properly integrated');
            } else {
                console.log('⚠️  renderProductCard exists but may not be unified');
            }
        }
    } catch (error) {
        results.errors.push(`Function override check failed: ${error.message}`);
    }

    // Check for style conflicts
    try {
        const testDiv = document.createElement('div');
        testDiv.className = 'drive-product-card';
        testDiv.style.position = 'absolute';
        testDiv.style.left = '-9999px';
        document.body.appendChild(testDiv);
        
        const styles = window.getComputedStyle(testDiv);
        const hasUnifiedStyles = styles.borderRadius === '16px' || 
                                styles.borderRadius.includes('16px');
        
        document.body.removeChild(testDiv);
        
        if (hasUnifiedStyles) {
            console.log('✅ Unified styles are being applied');
            results.conflictsResolved = true;
        } else {
            console.log('⚠️  Unified styles may not be applied correctly');
        }
    } catch (error) {
        results.errors.push(`Style conflict check failed: ${error.message}`);
    }

    // Check for deprecated class usage
    try {
        const deprecatedClasses = [
            'product-modal-content',
            'product-modal-header', 
            'product-modal-body'
        ];
        
        let deprecatedFound = 0;
        deprecatedClasses.forEach(className => {
            const elements = document.getElementsByClassName(className);
            if (elements.length > 0) {
                deprecatedFound++;
                console.log(`⚠️  Found deprecated class: .${className} (${elements.length} elements)`);
            }
        });
        
        if (deprecatedFound === 0) {
            console.log('✅ No deprecated classes found in current DOM');
        }
    } catch (error) {
        results.errors.push(`Deprecated class check failed: ${error.message}`);
    }

    // Test drive product rendering (if container exists)
    try {
        const testContainer = document.getElementById('product-card-container') || 
                            document.getElementById('drive-content-area') ||
                            document.createElement('div');
        
        if (testContainer && results.rendererAvailable) {
            const testProduct = {
                product_id: 'test-123',
                product_name: 'Test Product',
                product_price: 100.00,
                order_commission: 5.00,
                product_image: './assets/uploads/images/ph.png'
            };
            
            // Test rendering without actually modifying the DOM
            const htmlResult = typeof window.generateDriveProductHTML === 'function' ?
                window.generateDriveProductHTML(testProduct) : 'Function not available';
            
            if (htmlResult && htmlResult.includes('drive-product-card')) {
                console.log('✅ Drive product rendering test passed');
            } else {
                console.log('⚠️  Drive product rendering test inconclusive');
            }
        }
    } catch (error) {
        results.errors.push(`Rendering test failed: ${error.message}`);
    }

    // Summary
    console.log('\n📊 Verification Summary:');
    console.log(`CSS Loaded: ${results.cssLoaded ? '✅' : '❌'}`);
    console.log(`JS Loaded: ${results.jsLoaded ? '✅' : '❌'}`);
    console.log(`Renderer Available: ${results.rendererAvailable ? '✅' : '❌'}`);
    console.log(`Conflicts Resolved: ${results.conflictsResolved ? '✅' : '❌'}`);
    
    if (results.errors.length > 0) {
        console.log('\n⚠️  Errors found:');
        results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    const allGood = results.cssLoaded && results.jsLoaded && 
                   results.rendererAvailable && results.errors.length === 0;
    
    if (allGood) {
        console.log('\n🎉 Drive Unified System is working correctly!');
    } else {
        console.log('\n⚠️  Some issues found. Check the documentation for troubleshooting.');
    }
    
    return results;
}

// Auto-run verification if this script is loaded directly
if (typeof window !== 'undefined' && window.location) {
    console.log('Drive Unified System Verification Script Loaded');
    console.log('Run verifyDriveUnifiedSystem() to check the implementation');
    
    // Auto-verify after a short delay to ensure all scripts are loaded
    setTimeout(() => {
        if (document.readyState === 'complete') {
            console.log('\n🔄 Auto-running verification...');
            verifyDriveUnifiedSystem();
        }
    }, 2000);
}

// Export for manual testing
window.verifyDriveUnifiedSystem = verifyDriveUnifiedSystem;
