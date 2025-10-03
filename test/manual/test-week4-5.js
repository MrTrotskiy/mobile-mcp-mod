/**
 * Manual test for Week 4-5 features:
 * - Video recording
 * - Performance monitoring
 * 
 * Note: Visual testing skipped due to ESM module compatibility
 */

const { AndroidRobot } = require('../../lib/android');

async function testWeek45Features() {
  console.log('=== Testing Week 4-5 Features ===\n');
  
  const robot = new AndroidRobot('843b3cd3');
  const packageName = 'com.android.settings'; // Using Settings app for testing
  
  try {
    // Test 1: Launch app
    console.log('Test 1: Launch Settings app');
    await robot.launchApp(packageName);
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('  ✓ App launched\n');
    
    // Test 2: Performance Monitoring
    console.log('Test 2: Performance Monitoring');
    const { PerformanceMonitor } = require('../../lib/performance-monitor');
    const perfMonitor = new PerformanceMonitor();
    
    await perfMonitor.startMonitoring('843b3cd3', packageName, 'android', 500);
    console.log('  Started monitoring...');
    
    // Interact with app while monitoring
    await robot.swipe('up');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await robot.swipe('down');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const metrics = await perfMonitor.stopMonitoring();
    const avg = perfMonitor.getAverageMetrics();
    const peak = perfMonitor.getPeakMetrics();
    
    console.log(`  Samples collected: ${metrics.length}`);
    if (avg) {
      console.log(`  Average CPU: ${avg.cpu.toFixed(2)}%`);
      console.log(`  Average Memory: ${avg.memory.toFixed(2)} MB`);
    }
    if (peak) {
      console.log(`  Peak CPU: ${peak.cpu.toFixed(2)}%`);
      console.log(`  Peak Memory: ${peak.memory.toFixed(2)} MB`);
    }
    console.log('  ✓ Performance monitoring works\n');
    
    // Test 3: Video Recording
    console.log('Test 3: Video Recording');
    const { VideoRecorder } = require('../../lib/video-recorder');
    const videoRecorder = new VideoRecorder();
    
    const outputPath = await videoRecorder.startRecording('843b3cd3', 'android', {
      maxDuration: 5 // 5 seconds only
    });
    console.log('  Started recording...');
    
    // Do some actions while recording
    await robot.swipe('up');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await robot.swipe('down');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await robot.swipe('up');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('  Stopping recording...');
    const video = await videoRecorder.stopRecording();
    console.log(`  ✓ Video saved: ${video.path}`);
    console.log(`  Size: ${(video.size / 1024 / 1024).toFixed(2)} MB\n`);
    
    // Close app
    await robot.pressBack();
    await robot.pressHome();
    
    console.log('=== All Tests Passed! ===\n');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testWeek45Features();

