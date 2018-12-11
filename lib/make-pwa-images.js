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

// Generate app icon and splashscreen images.

const Path = require('path');

const SourceImagePath = '_pwa';
const TargetImagePath = 'pwa';

const BaseAppIconName = 'appicon';
const DefaultBaseAppIconPath = Path.join( Path.dirname( __dirname ), 'assets/appicon.png');
const BaseStdSplashscreenName = 'splashscreen';
const BaseIOSSplashscreenName = 'ios/splashscreen';

const {
    AppIconDefs,
    SplashscreenDefs
} = require('./settings');

const {
    cp,
    exists,
    ensureDir,
    rmrf,
} = require('./support');

const { loadManifest } = require('./manifest');

/**
 * Generate app icon and splashscreen images.
 * @param opts      Build options.
 * @param source    The build source path.
 * @param target    The build target path.
 */
async function make( opts, source, target ) {

    // Read app background colour from manifest.
    const { pwa: { background_color } } = await loadManifest( opts, source );

    const sourcePath = Path.join( source, SourceImagePath );
    const targetPath = Path.join( target, TargetImagePath );

    // Remove all files from target.
    //      > Question: Will generated images always be byte-for-byte identical?
    await rmrf( targetPath );

    // Find app icon base image.
    const baseAppIconPath = await findFileMatch(
        sourcePath,
        BaseAppIconName,
        ['png','svg'],
        DefaultBaseAppIconPath );

    // Build app icons.
    console.log('Building app icons...');
    await buildImages(
        sourcePath,
        baseAppIconPath,
        AppIconDefs,
        ['png','svg'],
        targetPath,
        background_color );

    // Build non-iOS splashscreens.
    const baseStdSplashscreenPath = await findFileMatch(
        sourcePath,
        BaseStdSplashscreenName,
        ['png','svg'],
        DefaultStdSplashscreenPath );

    console.log('Building standard splashscreens...');
    await buildImages(
        sourcePath,
        baseStdSplashscreenPath, 
        SplashscreenDefs.filter( d => d.target == 'std' ),
        ['png','svg'],
        targetPath,
        background_color );

    // Build iOS splashscreens.
    const baseIosSplashscreenPath = await findFileMatch(
        sourcePath,
        BaseIOSSplashscreenName,
        ['png'],
        baseStdSplashscreenPath ); // TODO: What if this is SVG?

    console.log('Building iOS splashscreens...');
    await buildImages(
        sourcePath,
        baseIosSplashscreenPath,
        SplashscreenDefs.filter( d => d.target == 'ios' ),
        ['png'],
        targetPath,
        background_color );
}

/**
 * Build a set of images from a list of image definitions.
 * Copies or scales images as appropriate.
 * @param sourcePath    The base source path.
 * @param baseImagePath The path to the base image to be scaled.
 * @param imageDefs     An array of image definitions.
 * @param exts          An array of supported image file extensions.
 * @param targetPath    The location to write results to.
 * @param bgColor       The app background color; needed when doing non-aspect
 *                      ratio preserving image resizes.
 */
async function buildImages( sourcePath, baseImagePath, imageDefs, exts, targetPath, bgColor ) {
    for( let { target, w, h } of imageDefs ) {
        let imagePath = `${target}/${w}x${h}`;
        let targetImagePath = Path.join( targetPath, imagePath );
        // Ensure target dir exists.
        await ensureDir( Path.dirname( targetImagePath ) );
        // Check for existing image at target size.
        let existingImagePath = await findFileMatch( sourcePath, imagePath, exts );
        if( existingImagePath ) {
            // If pre-scaled copy of image provided then copy to target.
            console.log('\tCopying %s -> %s', existingImagePath, targetImagePath );
            await cp( existingImagePath, targetImagePath );
        }
        else {
            // Else generate scaled copy of image from base image.
            console.log('\tScaling %s -> %s', baseImagePath, targetImagePath );
            await scaleImage( baseImagePath, targetImagePath, w, h, bgColor );
        }
    }
}

/**
 * Look for a existing file from a number of alternatives.
 * @param basePath      A path to search under.
 * @param path          A file path to look for, without file extension.
 * @param exts          A list of file extensions to look for.
 * @param defaultPath   (Optional) a default path to return if no matches are found.
 * @returns The first existing file path that matches the constraints.
 */
async function findFileMatch( basePath, path, exts, defaultPath ) {
    // Iterate over the list of file extensions and test for each one.
    for( let ext of exts ) {
        let filePath = `${path}.${ext}`;
        if( await exists( filePath ) ) {
            return filePath;
        }
    }
    // No matches found, return the default path if it exists.
    if( defaultPath && await exists( defaultPath ) ) {
        return defaultPath;
    }
    // Nothing found.
    return null;
}

/**
 * Scale an image.
 * @param source    The path to the source image.
 * @param target    The path to the output file.
 * @param width     The width to scale to.
 * @param height    The height to scale to.
 * @param bgColor   The image background colour; used when the image resize won't
 *                  preserve the image aspect ratio.
 */
function scaleImage( source, target, width, height, bgColor = 'black' ) {
    let args = [
        source,
        '-resize',      `${width}x${height}^`,
        '-background',  bgColor,
        '-compose',     'Copy',
        '-gravity',     'center',
        '-extent',      `${width}x${height}`,
        target
    ];
    return exec('convert', args );
}

exports.make = make;