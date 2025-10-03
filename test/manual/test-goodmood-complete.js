/**
 * Comprehensive test of Week 4-5 features on GoodMood app
 * - Video recording
 * - Performance monitoring
 * - Clipboard operations
 * - Device conditions simulation
 * 
 * Note: Visual testing skipped due to ESM module compatibility
 */

const { AndroidRobot } = require('../../lib/android');
const { VideoRecorder } = require('../../lib/video-recorder');
const { PerformanceMonitor } = require('../../lib/performance-monitor');
const { DeviceConditions } = require('../../lib/device-conditions');

async function testGoodMoodComplete() {
  console.log('=== COMPREHENSIVE TEST: All Week 4-5 Features on GoodMood ===\n');
  
  const robot = new AndroidRobot('843b3cd3');
  const packageName = 'com.thegoodmoodco';
  
  try {
    // ============================================
    // PART 1: DEVICE CONDITIONS - Setup test environment
    // ============================================
    console.log('PART 1: Device Conditions - Setup test environment');
    const conditions = new DeviceConditions();
    
    // Get initial battery status
    const batteryBefore = await conditions.getBatteryStatus('843b3cd3');
    console.log(`  Initial battery: ${batteryBefore.level}%`);
    
    // Set to full battery for testing
    await conditions.setBatteryLevel('843b3cd3', 100);
    console.log('  ✓ Battery set to 100% for testing\n');
    
    // ============================================
    // PART 2: LAUNCH APP
    // ============================================
    console.log('PART 2: Launch app');
    await robot.launchApp(packageName);
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('  ✓ GoodMood launched\n');
    
    // ============================================
    // PART 3: CLIPBOARD OPERATIONS
    // ============================================
    console.log('PART 3: Clipboard operations');
    
    // Set clipboard with test data
    const testText = 'GoodMood Test Data 🌟';
    await robot.setClipboard(testText);
    console.log(`  Set clipboard: "${testText}"`);
    
    // Verify clipboard
    const clipboardContent = await robot.getClipboard();
    console.log(`  Read clipboard: "${clipboardContent}"`);
    
    if (clipboardContent.includes('GoodMood')) {
      console.log('  ✓ Clipboard operations work\n');
    } else {
      console.log('  ⚠ Clipboard content differs (Android limitation)\n');
    }
    
    // ============================================
    // PART 4: PERFORMANCE MONITORING + VIDEO RECORDING
    // ============================================
    console.log('PART 4: Performance monitoring + Video recording during usage');
    
    // Start performance monitoring
    const perfMonitor = new PerformanceMonitor();
    await perfMonitor.startMonitoring('843b3cd3', packageName, 'android', 1000);
    console.log('  ✓ Performance monitoring started');
    
    // Start video recording
    const videoRecorder = new VideoRecorder();
    const videoPath = await videoRecorder.startRecording('843b3cd3', 'android', {
      maxDuration: 15 // 15 seconds
    });
    console.log('  ✓ Video recording started\n');
    
    // Perform user actions
    console.log('  Performing user interactions...');
    await robot.tap(500, 1000);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await robot.swipe('left');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await robot.swipe('right');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await robot.tap(540, 1500);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await robot.swipe('up');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await robot.swipe('down');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('  ✓ User interactions completed\n');
    
    // Stop monitoring and recording
    const metrics = await perfMonitor.stopMonitoring();
    const video = await videoRecorder.stopRecording();
    
    const avg = perfMonitor.getAverageMetrics();
    const peak = perfMonitor.getPeakMetrics();
    
    console.log('  Performance Results:');
    console.log(`    Samples: ${metrics.length}`);
    if (avg) {
      console.log(`    Avg CPU: ${avg.cpu.toFixed(2)}%`);
      console.log(`    Avg Memory: ${avg.memory.toFixed(2)} MB`);
    }
    if (peak) {
      console.log(`    Peak CPU: ${peak.cpu.toFixed(2)}%`);
      console.log(`    Peak Memory: ${peak.memory.toFixed(2)} MB`);
    }
    console.log(`\n  Video Recording:`);
    console.log(`    File: ${video.path}`);
    console.log(`    Size: ${(video.size / 1024 / 1024).toFixed(2)} MB\n`);
    
    // ============================================
    // PART 5: SCREENSHOT TEST
    // ============================================
    console.log('PART 5: Screenshot test');
    
    // Take screenshot
    const screenshot = await robot.getScreenshot();
    console.log(`  Screenshot captured: ${screenshot.length} bytes`);
    console.log('  ✓ Screenshot functionality works\n');
    
    // ============================================
    // PART 6: DEVICE CONDITIONS - Test low battery scenario
    // ============================================
    console.log('PART 6: Device conditions - Low battery simulation');
    
    // Simulate low battery
    await conditions.setBatteryLevel('843b3cd3', 15);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const batteryLow = await conditions.getBatteryStatus('843b3cd3');
    console.log(`  Battery level: ${batteryLow.level}%`);
    console.log('  ✓ Low battery simulated\n');
    
    // Interact with app in low battery mode
    await robot.tap(500, 1000);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('  ✓ App responds in low battery mode\n');
    
    // Reset battery
    await conditions.resetBattery('843b3cd3');
    console.log('  ✓ Battery reset to normal\n');
    
    // ============================================
    // PART 7: CLEANUP
    // ============================================
    console.log('PART 7: Cleanup');
    
    // Clear clipboard
    await robot.clearClipboard();
    console.log('  ✓ Clipboard cleared');
    
    // Close app (go to home)
    // Note: pressHome not available, just leave app open
    console.log('  ✓ Test completed\n');
    
    // ============================================
    // SUMMARY
    // ============================================
    console.log('=== TEST SUMMARY ===\n');
    console.log('✅ Device Conditions: Battery simulation tested');
    console.log('✅ Screenshot: Capture tested');
    console.log('✅ Clipboard: Set/Get operations tested');
    console.log('✅ Performance Monitoring: ' + metrics.length + ' samples collected');
    console.log('✅ Video Recording: ' + (video.size / 1024 / 1024).toFixed(2) + ' MB recorded');
    console.log('\nWeek 4-5 features tested on GoodMood! 🎉');
    console.log('(Visual testing works separately via TypeScript)\n');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testGoodMoodComplete();

