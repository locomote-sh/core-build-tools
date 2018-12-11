/*
   Copyright 2018 Locomote Limited

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

// Generate HTML head section tags for a PWA page.

const Path = require('path');

const { loadManifest } = require('./manifest');

const {
    AppIconDefs,
    SplashscreenDefs,
    InstallBannerJSURL,
    InstallBannerCSSURL
} = require('./settings');

const IOSAppIconDefs = AppIconDefs.filter( d => d.target == 'ios' );
const IOSSplashscreenDefs = SplashscreenDefs.filter( d => d.target == 'ios' );

/**
 * Generate a PWA HTML page head section.
 * @param opts      Build options.
 * @param source    The build source path.
 * @return A string with the generated HTML.
 */
async function make( opts, source ) {

    // Read Locomote manifest.
    const { pwa } = await loadManifest( opts, source );

    const print = getPrinter( opts );

    print('<meta charset="utf-8" />');
    print('<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />');
    print(`<meta name="theme-color" content="${pwa.background_color}" />`);
    print();
    print(`<title>${pwa.name}</title>`);
    print();
    print('<link rel="manifest" href="manifest.webmanifest" />');
    print();

    // Iterate over icon width x height.
    const icons = getIconDefs( opts );
    for( let { w, h } of icons ) {
        print(`<link rel="apple-touch-icon" sizes="${w}x${h}" href="pwa/appicon/${w}x${h}.png" />`);
    }

    print();

    // Iterate over splashscreen width x height, device width + height + display depth
    const splashscreens = getSplashscreenDefs( opts );
    for( let { w, h, dw, dh, dd } of splashscreens ) {
        print('<link rel="apple-touch-startup-image"',
            `    href="pwa/splashscreen/${w}x${h}.png"`,
            `    media="(device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${dd})" />`);
    }

    print();

    print(`<meta name="apple-mobile-web-app-title" content="${pwa.short_name}" />`);
    print(`<meta name="apple-mobile-web-app-capable" content="${getWebAppCapable(pwa)}" />`);
    print(`<meta name="apple-mobile-web-app-status-bar-style" content="${getStatusBarStyle(pwa)}" />`);

    if( pwa.ios.showInstallBanner ) {
        print();
        print(`<link rel="stylesheet" href="${InstallBannerCSSURL}" />`);
        print(`<script src="${InstallBannerJSURL}"></script>`);
    }

    return print.result();
}

/**
 * Return a function for printing the result.
 * Handles newlines, indents etc.
 */
function getPrinter( opts ) {
    // Calculate leading indent from options and whether to trim lines.
    const { indentSize } = opts;
    const indent = ''.padEnd( typeof indentSize === 'number' ? indentSize : 4, ' ' );
    const trim = indentSize == 0;
    // The result string.
    let result = '';
    // Function to print to the result.
    function print() {
        // If no arguments then print a newline.
        if( arguments.length == 0 ) {
            result += '\n';
            return;
        }
        // Iterate over each line...
        Array.from( arguments ).forEach( line => {
            // ...print the indent
            result += indent;
            // ...trim the line (if necessary)...
            if( trim ) {
                line = line.trim();
            }
            // ...print the line...
            result += line;
            // ...print a newline...
            result += '\n';
        });
    }

    // Add lambda to return the result.
    print.result = () => result;

    return print;
}

// Return the a list of app icon definitions.
function getIconDefs( opts ) {
    return IOSAppIconDefs;
}

// Return a list of splashscreen definitions.
function getSplashscreenDefs( opts ) {
    return IOSSplashscreenDefs;
}

// Return a value for the apple-mobile-web-app-capable meta tag.
function getWebAppCapable( pwa ) {
    return pwa.display == 'fullscreen' ? 'yes' : 'no';
}

// Return a value for the apple-mobile-web-app-status-bar-style meta tag.
function getStatusBarStyle( pwa ) {
    let { display, ios: { statusBarStyle } } = pwa;
    switch( statusBarStyle ) {
        case 'default':
        case 'black':
        case 'black-translucent':
            // Valid status bar value.
            return statusBarStyle;
    }
    // Invalid or missing status bar value.
    if( display == 'fullscreen' ) {
        return 'black-translucent';
    }
    return 'default';
}

exports.make = make;