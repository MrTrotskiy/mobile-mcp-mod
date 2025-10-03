/**
 * Manual test for Week 4-5 features on GoodMood app:
 * - Video recording
 * - Performance monitoring
 */

const { AndroidRobot } = require('../../lib/android');

async function testGoodMoodWeek45() {
  console.log('=== Testing Week 4-5 Features on GoodMood App ===\n');
  
  const robot = new AndroidRobot('843b3cd3');
  const packageName = 'com.thegoodmoodco';
  
  try {
    // Test 1: Launch GoodMood app
    console.log('Test 1: Launch GoodMood app');
    await robot.launchApp(packageName);
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('  ✓ App launched\n');
    
    // Test 2: Performance Monitoring while using app
    console.log('Test 2: Performance Monitoring during app usage');
    const { PerformanceMonitor } = require('../../lib/performance-monitor');
    const perfMonitor = new PerformanceMonitor();
    
    await perfMonitor.startMonitoring('843b3cd3', packageName, 'android', 1000);
    console.log('  Started monitoring...');
    
    // Interact with app while monitoring
    console.log('  Interacting with app...');
    await robot.tap(500, 1000);
    await new Promise(resolve => setTimeout(resolve, 1500));
    await robot.swipe('up');
    await new Promise(resolve => setTimeout(resolve, 1500));
    await robot.swipe('down');
    await new Promise(resolve => setTimeout(resolve, 1500));
    await robot.tap(500, 1500);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
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
    
    // Test 3: Video Recording of app workflow
    console.log('Test 3: Video Recording of app workflow');
    const { VideoRecorder } = require('../../lib/video-recorder');
    const videoRecorder = new VideoRecorder();
    
    const outputPath = await videoRecorder.startRecording('843b3cd3', 'android', {
      maxDuration: 10 // 10 seconds
    });
    console.log('  Started recording...');
    
    // Do some typical user actions while recording
    console.log('  Performing user actions...');
    await robot.swipe('left');
    await new Promise(resolve => setTimeout(resolve, 1500));
    await robot.swipe('right');
    await new Promise(resolve => setTimeout(resolve, 1500));
    await robot.tap(540, 960); // Center tap
    await new Promise(resolve => setTimeout(resolve, 2000));
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('  Stopping recording...');
    const video = await videoRecorder.stopRecording();
    console.log(`  ✓ Video saved: ${video.path}`);
    console.log(`  Size: ${(video.size / 1024 / 1024).toFixed(2)} MB\n`);
    
    console.log('=== All Tests Passed on GoodMood! ===\n');
    console.log('Summary:');
    console.log(`- Performance monitoring: ${metrics.length} samples collected`);
    console.log(`- Video recording: ${(video.size / 1024 / 1024).toFixed(2)} MB saved`);
    console.log(`- Video file: ${video.path}\n`);
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testGoodMoodWeek45();

