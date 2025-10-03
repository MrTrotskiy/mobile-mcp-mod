/**
 * Test tap functionality on GoodMood app
 * Verify that taps actually work and cause screen changes
 */

const { AndroidRobot } = require('../../lib/android');

async function testTaps() {
  console.log('=== Testing Tap Functionality on GoodMood ===\n');
  
  const robot = new AndroidRobot('843b3cd3');
  const packageName = 'com.thegoodmoodco';
  
  try {
    // Launch app
    console.log('Step 1: Launch GoodMood');
    await robot.launchApp(packageName);
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('  ✓ App launched\n');
    
    // Get initial screen
    console.log('Step 2: Capture initial screen');
    const screen1 = await robot.getScreenshot();
    console.log(`  Screenshot 1: ${screen1.length} bytes\n`);
    
    // Get screen elements
    console.log('Step 3: Get screen elements');
    const elements = await robot.getElementsOnScreen();
    console.log(`  Found ${elements.length} elements\n`);
    
    // Show first 10 elements
    console.log('  First 10 elements:');
    elements.slice(0, 10).forEach((el, i) => {
      console.log(`    ${i + 1}. ${el.type} - "${el.text || el.label || 'no text'}" at (${el.rect.x}, ${el.rect.y})`);
    });
    console.log('');
    
    // Test 1: Tap in center of screen
    console.log('Test 1: Tap in center of screen');
    const centerX = 540;
    const centerY = 960;
    console.log(`  Tapping at (${centerX}, ${centerY})`);
    await robot.tap(centerX, centerY);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const screen2 = await robot.getScreenshot();
    const changed1 = screen1.compare(screen2) !== 0;
    console.log(`  Screen changed: ${changed1 ? '✓ YES' : '✗ NO'}`);
    console.log(`  Screenshot 2: ${screen2.length} bytes\n`);
    
    // Test 2: Tap on specific element (if we found any clickable)
    const clickableElements = elements.filter(el => 
      el.type.includes('Button') || 
      el.label?.length > 0 ||
      el.text?.length > 0
    );
    
    let screen3 = screen2;
    let changed2 = false;
    
    if (clickableElements.length > 0) {
      console.log(`Test 2: Tap on element "${clickableElements[0].text || clickableElements[0].label}"`);
      const el = clickableElements[0];
      const tapX = el.rect.x + el.rect.width / 2;
      const tapY = el.rect.y + el.rect.height / 2;
      console.log(`  Element position: (${tapX.toFixed(0)}, ${tapY.toFixed(0)})`);
      
      await robot.tap(tapX, tapY);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      screen3 = await robot.getScreenshot();
      changed2 = screen2.compare(screen3) !== 0;
      console.log(`  Screen changed: ${changed2 ? '✓ YES' : '✗ NO'}`);
      console.log(`  Screenshot 3: ${screen3.length} bytes\n`);
    } else {
      console.log('Test 2: Skipped (no clickable elements found)\n');
    }
    
    // Test 3: Swipe down to reveal more content
    console.log('Test 3: Swipe down to reveal content');
    await robot.swipe('down');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const screen4 = await robot.getScreenshot();
    const changed3 = screen3.compare(screen4) !== 0;
    console.log(`  Screen changed after swipe: ${changed3 ? '✓ YES' : '✗ NO'}`);
    console.log(`  Screenshot 4: ${screen4.length} bytes\n`);
    
    // Test 4: Tap on "Brain" element (should navigate)
    console.log('Test 4: Tap on "Brain" goal');
    const brainElement = elements.find(el => el.text === 'Brain');
    if (brainElement) {
      const tapX = brainElement.rect.x + brainElement.rect.width / 2;
      const tapY = brainElement.rect.y + brainElement.rect.height / 2;
      console.log(`  Tapping Brain at (${tapX.toFixed(0)}, ${tapY.toFixed(0)})`);
      await robot.tap(tapX, tapY);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const screen5a = await robot.getScreenshot();
      const changed4 = screen4.compare(screen5a) !== 0;
      console.log(`  Screen changed after Brain tap: ${changed4 ? '✓ YES' : '✗ NO'}`);
      console.log(`  Screenshot 5a: ${screen5a.length} bytes\n`);
    } else {
      console.log('  Brain element not found, skipping\n');
    }
    
    // Summary
    console.log('=== TAP TEST SUMMARY ===\n');
    console.log('Tests performed:');
    console.log('  1. Center tap - Screen changed:', changed1 ? '✓' : '✗');
    console.log('  2. Element tap - Screen changed:', changed2 ? '✓' : '✗');
    console.log('  3. Swipe down - Screen changed:', changed3 ? '✓' : '✗');
    console.log('');
    
    if (changed1 || changed2 || changed3) {
      console.log('✅ Interactions are working - screen changes detected!\n');
    } else {
      console.log('⚠️  No screen changes detected\n');
      console.log('Note: Taps executed successfully but app screen may be static or');
      console.log('      taps may be in non-interactive areas.\n');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testTaps();

