const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const cheerio = require('cheerio');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const { minify: htmlMinify } = require('html-minifier-terser');

const isProduction = process.env.NODE_ENV === 'production';
const buildDir = path.join(__dirname, 'dist');
const componentsDir = path.join(__dirname, 'components');
const assetsToCopy = ['assets']; // CSS and JS are now processed

async function build() {
  try {
    // 1. Clean and create the build directory
    console.log(`Starting build for ${isProduction ? 'production' : 'development'}...`);
    await fs.emptyDir(buildDir);
    console.log(`Build directory '${buildDir}' is ready.`);

    // 2. Read component HTML
    const headerHtml = await fs.readFile(path.join(componentsDir, 'header.html'), 'utf-8');
    const footerHtml = await fs.readFile(path.join(componentsDir, 'footer.html'), 'utf-8');

    // 3. Process all top-level HTML files
    console.log('Processing HTML files...');
    const htmlFiles = glob.sync('*.html', { cwd: __dirname, absolute: true });

    for (const file of htmlFiles) {
      const fileName = path.basename(file);
      const fileContent = await fs.readFile(file, 'utf-8');
      const $ = cheerio.load(fileContent);

      $('#header-placeholder').replaceWith(headerHtml);
      $('#footer-placeholder').replaceWith(footerHtml);
      $('script[src="js/components.js"]').remove();

      let finalHtml = $.html();
      if (isProduction) {
        finalHtml = await htmlMinify(finalHtml, {
          collapseWhitespace: true,
          removeComments: true,
          minifyCSS: true,
          minifyJS: true,
        });
      }
      await fs.writeFile(path.join(buildDir, fileName), finalHtml);
    }
    console.log('HTML files processed.');

    // 4. Process and copy CSS files
    console.log('Processing CSS files...');
    const cssFiles = glob.sync('css/**/*.css', { cwd: __dirname, absolute: true });
    for (const file of cssFiles) {
        const content = await fs.readFile(file, 'utf-8');
        const relativePath = path.relative(__dirname, file);
        const destPath = path.join(buildDir, relativePath);
        await fs.ensureDir(path.dirname(destPath));

        if (isProduction) {
            const { styles } = new CleanCSS().minify(content);
            await fs.writeFile(destPath, styles);
        } else {
            await fs.copy(file, destPath);
        }
    }
    console.log('CSS files processed.');

    // 5. Process and copy JavaScript files
    console.log('Processing JavaScript files...');
    const jsFiles = glob.sync('js/**/*.js', { cwd: __dirname, absolute: true });
    for (const file of jsFiles) {
        const content = await fs.readFile(file, 'utf-8');
        const relativePath = path.relative(__dirname, file);
        const destPath = path.join(buildDir, relativePath);
        await fs.ensureDir(path.dirname(destPath));

        if (isProduction && !file.includes('build.js')) { // Don't minify the build script itself
            const result = await minify(content);
            await fs.writeFile(destPath, result.code);
        } else {
            await fs.copy(file, destPath);
        }
    }
    console.log('JavaScript files processed.');

    // 6. Copy other asset directories
    console.log('Copying other assets...');
    for (const asset of assetsToCopy) {
      const sourcePath = path.join(__dirname, asset);
      const destPath = path.join(buildDir, asset);
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, destPath);
      }
    }
    console.log('Assets copied.');

    console.log(`\nBuild for ${isProduction ? 'production' : 'development'} complete!`);
    console.log('Your static site is ready in the "dist" folder.');

  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
