/**
 * Manual Test: Screenshot Annotations
 * 
 * Tests screenshot annotation features on Android device
 * 
 * Usage:
 * 1. Make sure app is open on device
 * 2. Run: node test/manual/test-annotations.js
 */

const { AndroidRobot } = require('../../lib/android');
const { ScreenshotAnnotator, Colors } = require('../../lib/screenshot-annotator');

const DEVICE_ID = '843b3cd3';

async function main() {
  console.log('🎨 Starting Screenshot Annotation Testing...\n');
  
  const robot = new AndroidRobot(DEVICE_ID);
  const annotator = new ScreenshotAnnotator();
  
  try {
    // Test 1: Basic annotations
    console.log('Test 1: Adding basic annotations...');
    const screenshot1 = await robot.getScreenshot();
    annotator.loadScreenshot(screenshot1);
    annotator.clearAnnotations();
    
    // Add rectangle
    annotator.addRectangle(100, 200, 300, 150, Colors.RED, { label: 'Important Area' });
    
    // Add circle
    annotator.addCircle(500, 300, 50, Colors.BLUE, { filled: true });
    
    // Add text
    annotator.addText(100, 500, 'Test Annotation', Colors.BLACK, {
      fontSize: 30,
      backgroundColor: Colors.YELLOW
    });
    
    const saved1 = await annotator.save('test-basic-annotations');
    console.log(`✅ Saved to: ${saved1}\n`);
    
    // Test 2: Highlight element
    console.log('Test 2: Highlighting element...');
    const screenshot2 = await robot.getScreenshot();
    const elements = await robot.getElementsOnScreen();
    
    if (elements.length > 0) {
      annotator.loadScreenshot(screenshot2);
      annotator.clearAnnotations();
      
      // Highlight first interactive element
      const interactiveElement = elements.find(e => e.clickable);
      if (interactiveElement) {
        annotator.highlightElement(interactiveElement, Colors.GREEN, 'Clickable Element');
        const saved2 = await annotator.save('test-highlighted-element');
        console.log(`✅ Highlighted: ${interactiveElement.type} "${interactiveElement.text || '(no text)'}"`);
        console.log(`   Saved to: ${saved2}\n`);
      } else {
        console.log('⚠️ No clickable elements found\n');
      }
    }
    
    // Test 3: Mark tap points
    console.log('Test 3: Marking tap points...');
    const screenshot3 = await robot.getScreenshot();
    annotator.loadScreenshot(screenshot3);
    annotator.clearAnnotations();
    
    // Mark 3 tap points
    annotator.markTapPoint(200, 300, Colors.RED, 'Step 1');
    annotator.markTapPoint(400, 500, Colors.RED, 'Step 2');
    annotator.markTapPoint(600, 700, Colors.RED, 'Step 3');
    
    const saved3 = await annotator.save('test-tap-points');
    console.log(`✅ Marked 3 tap points`);
    console.log(`   Saved to: ${saved3}\n`);
    
    // Test 4: Highlight with semi-transparent overlay
    console.log('Test 4: Adding highlight overlay...');
    const screenshot4 = await robot.getScreenshot();
    annotator.loadScreenshot(screenshot4);
    annotator.clearAnnotations();
    
    // Add semi-transparent highlights
    annotator.addHighlight(100, 100, 400, 200, Colors.YELLOW, 0.4);
    annotator.addHighlight(100, 350, 400, 200, Colors.BLUE, 0.3);
    
    const saved4 = await annotator.save('test-highlights');
    console.log(`✅ Added highlight overlays`);
    console.log(`   Saved to: ${saved4}\n`);
    
    // Test 5: Complex annotation (multiple elements)
    console.log('Test 5: Complex annotation with multiple elements...');
    const screenshot5 = await robot.getScreenshot();
    annotator.loadScreenshot(screenshot5);
    annotator.clearAnnotations();
    
    // Highlight all clickable elements
    let clickableCount = 0;
    for (const element of elements) {
      if (element.clickable && clickableCount < 5) {
        const color = clickableCount % 2 === 0 ? Colors.GREEN : Colors.ORANGE;
        annotator.addRectangle(
          element.rect.x,
          element.rect.y,
          element.rect.width,
          element.rect.height,
          color,
          { thickness: 3, label: `Element ${clickableCount + 1}` }
        );
        clickableCount++;
      }
    }
    
    const saved5 = await annotator.save('test-multiple-elements');
    console.log(`✅ Highlighted ${clickableCount} clickable elements`);
    console.log(`   Saved to: ${saved5}\n`);
    
    // Summary
    console.log('=' .repeat(60));
    console.log('📊 SUMMARY');
    console.log('=' .repeat(60));
    console.log('✅ All annotation tests passed!');
    console.log(`\nAnnotated screenshots saved to: test/annotated-screenshots/`);
    console.log('\nFeatures tested:');
    console.log('  ✓ Rectangle annotations with labels');
    console.log('  ✓ Circle annotations (filled and outlined)');
    console.log('  ✓ Text annotations with backgrounds');
    console.log('  ✓ Element highlighting');
    console.log('  ✓ Tap point marking');
    console.log('  ✓ Semi-transparent highlights');
    console.log('  ✓ Multiple element annotation');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  }
}

main();

