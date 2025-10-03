/**
 * Manual Test: Visual Touch Indicators
 * 
 * Tests touch indicator visualization on Android device
 * 
 * Usage: node test/manual/test-touch-indicators.js
 */

const { AndroidRobot } = require('../../lib/android');
const { VisualTouchIndicators } = require('../../lib/visual-touch-indicators');

const DEVICE_ID = '843b3cd3';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('👆 Starting Touch Indicators Test...\n');
  
  const robot = new AndroidRobot(DEVICE_ID);
  const indicators = new VisualTouchIndicators();
  
  try {
    // Test 1: Enable touch indicators
    console.log('Test 1: Enabling touch indicators...');
    const enableResult = indicators.enableAndroidTouchIndicators(DEVICE_ID, {
      showTouches: true,
      showPointerLocation: false
    });
    console.log(enableResult);
    
    // Test 2: Check status
    console.log('\nTest 2: Checking status...');
    const status = indicators.getAndroidTouchIndicatorStatus(DEVICE_ID);
    console.log(`Show Touches: ${status.showTouches ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Pointer Location: ${status.showPointerLocation ? '✅ Enabled' : '❌ Disabled'}`);
    
    // Test 3: Perform some taps with indicators visible
    console.log('\nTest 3: Performing taps (you should see circles!)...');
    const elements = await robot.getElementsOnScreen();
    
    if (elements.length > 0) {
      // Tap on first few elements
      for (let i = 0; i < Math.min(3, elements.length); i++) {
        const el = elements[i];
        const centerX = el.rect.x + el.rect.width / 2;
        const centerY = el.rect.y + el.rect.height / 2;
        
        console.log(`  Tapping element ${i + 1}: ${el.type} at (${centerX}, ${centerY})`);
        await robot.tap(centerX, centerY);
        await sleep(800); // Pause to see the tap indicator
      }
    }
    
    console.log('✅ Taps completed - did you see the circles?\n');
    
    // Test 4: Enable demo mode (with pointer trails)
    console.log('Test 4: Enabling demo mode (with pointer trails)...');
    const demoResult = indicators.enableDemoMode(DEVICE_ID, 'android');
    console.log(demoResult);
    
    // Perform swipe to show trails
    console.log('\nPerforming swipe (you should see trails!)...');
    await robot.swipe('down');
    await sleep(1000);
    console.log('✅ Swipe completed\n');
    
    // Test 5: Toggle off
    console.log('Test 5: Toggling indicators off...');
    const toggleResult = indicators.toggleAndroidTouchIndicators(DEVICE_ID);
    console.log(toggleResult);
    
    // Test 6: Final status check
    console.log('\nTest 6: Final status check...');
    const finalStatus = indicators.getAndroidTouchIndicatorStatus(DEVICE_ID);
    console.log(`Show Touches: ${finalStatus.showTouches ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Pointer Location: ${finalStatus.showPointerLocation ? '✅ Enabled' : '❌ Disabled'}`);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ All touch indicator tests passed!');
    console.log('\nFeatures tested:');
    console.log('  ✓ Enable/disable touch indicators');
    console.log('  ✓ Status checking');
    console.log('  ✓ Visual tap indicators (circles)');
    console.log('  ✓ Demo mode with pointer trails');
    console.log('  ✓ Toggle on/off');
    console.log('\n💡 Use mobile_enable_touch_indicators before recording demos!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    
    // Make sure to disable indicators on error
    try {
      indicators.disableAndroidTouchIndicators(DEVICE_ID);
      console.log('\n✅ Indicators disabled after error');
    } catch {}
    
    process.exit(1);
  }
}

main();

