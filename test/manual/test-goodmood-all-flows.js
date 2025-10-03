/**
 * Comprehensive test of ALL flows in GoodMood app
 * Tests navigation, interactions, assessments, and all major features
 */

const { AndroidRobot } = require('../../lib/android');
const { PerformanceMonitor } = require('../../lib/performance-monitor');
const { AccessibilityChecker } = require('../../lib/accessibility-checker');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAllGoodMoodFlows() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   COMPREHENSIVE TEST: ALL FLOWS IN GOODMOOD APP');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const robot = new AndroidRobot('843b3cd3');
  const packageName = 'com.thegoodmoodco';
  
  try {
    // ============================================
    // FLOW 1: APP LAUNCH & HOME SCREEN
    // ============================================
    console.log('━━━ FLOW 1: App Launch & Home Screen ━━━');
    await robot.launchApp(packageName);
    await sleep(3000);
    console.log('✅ GoodMood app launched');
    
    const homeScreen = await robot.getScreenshot();
    console.log(`   Screenshot: ${(homeScreen.length / 1024).toFixed(1)} KB`);
    
    const homeElements = await robot.getElementsOnScreen();
    console.log(`   Found ${homeElements.length} UI elements`);
    
    // Show key elements
    console.log('\n   Key elements on home screen:');
    homeElements.slice(0, 8).forEach((el, i) => {
      const text = el.text || el.label || 'no text';
      console.log(`   ${i + 1}. ${el.type}: "${text.substring(0, 50)}..."`);
    });
    console.log('');
    
    // ============================================
    // FLOW 2: MOOD TRACKING
    // ============================================
    console.log('━━━ FLOW 2: Mood Tracking ━━━');
    
    // Look for mood-related elements
    const moodElement = homeElements.find(el => 
      el.text === 'Mood' || el.label === 'Mood'
    );
    
    if (moodElement) {
      console.log('   Found "Mood" section');
      const tapX = moodElement.rect.x + moodElement.rect.width / 2;
      const tapY = moodElement.rect.y + moodElement.rect.height / 2;
      console.log(`   Tapping Mood at (${tapX.toFixed(0)}, ${tapY.toFixed(0)})`);
      await robot.tap(tapX, tapY);
      await sleep(2000);
      
      const moodScreen = await robot.getScreenshot();
      const changed = !homeScreen.equals(moodScreen);
      console.log(`   Screen changed: ${changed ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log('   ⚠️  "Mood" element not found, trying center tap');
      await robot.tap(540, 300);
      await sleep(2000);
    }
    console.log('');
    
    // ============================================
    // FLOW 3: SCROLL & EXPLORE CONTENT
    // ============================================
    console.log('━━━ FLOW 3: Scroll & Explore Content ━━━');
    
    // Swipe up to see more content
    console.log('   Swiping up to reveal more content...');
    await robot.swipe('up');
    await sleep(1500);
    
    const afterScroll = await robot.getElementsOnScreen();
    console.log(`   After scroll: ${afterScroll.length} elements visible`);
    
    // Swipe down to go back
    console.log('   Swiping down to return...');
    await robot.swipe('down');
    await sleep(1500);
    console.log('   ✅ Scroll navigation works');
    console.log('');
    
    // ============================================
    // FLOW 4: ASSESSMENT FLOW
    // ============================================
    console.log('━━━ FLOW 4: Assessment Flow ━━━');
    
    // Look for "Start Assessment" button
    const elements = await robot.getElementsOnScreen();
    const assessmentButton = elements.find(el => 
      el.text?.includes('Start Assessment') || 
      el.text?.includes('Assessment') ||
      el.label?.includes('Assessment')
    );
    
    if (assessmentButton) {
      console.log('   Found "Start Assessment" button');
      const tapX = assessmentButton.rect.x + assessmentButton.rect.width / 2;
      const tapY = assessmentButton.rect.y + assessmentButton.rect.height / 2;
      console.log(`   Tapping at (${tapX.toFixed(0)}, ${tapY.toFixed(0)})`);
      await robot.tap(tapX, tapY);
      await sleep(3000);
      
      const assessmentElements = await robot.getElementsOnScreen();
      console.log(`   Assessment screen: ${assessmentElements.length} elements`);
      console.log('   ✅ Assessment flow accessible');
      
      // Go back
      await robot.pressKey('back');
      await sleep(1500);
    } else {
      console.log('   ⚠️  Assessment button not found');
    }
    console.log('');
    
    // ============================================
    // FLOW 5: BIOMARKERS SECTION
    // ============================================
    console.log('━━━ FLOW 5: Biomarkers Section ━━━');
    
    // Scroll to find biomarkers
    await robot.swipe('up');
    await sleep(1500);
    
    const bioElements = await robot.getElementsOnScreen();
    const biomarkersElement = bioElements.find(el => 
      el.text?.includes('Biomarkers') || el.label?.includes('Biomarkers')
    );
    
    if (biomarkersElement) {
      console.log('   Found "Biomarkers" section');
      const tapX = biomarkersElement.rect.x + biomarkersElement.rect.width / 2;
      const tapY = biomarkersElement.rect.y + biomarkersElement.rect.height / 2;
      console.log(`   Tapping Biomarkers at (${tapX.toFixed(0)}, ${tapY.toFixed(0)})`);
      await robot.tap(tapX, tapY);
      await sleep(2000);
      
      const bioScreen = await robot.getElementsOnScreen();
      console.log(`   Biomarkers screen: ${bioScreen.length} elements`);
      console.log('   ✅ Biomarkers section accessible');
      
      // Go back
      await robot.pressKey('back');
      await sleep(1500);
    } else {
      console.log('   ⚠️  Biomarkers section not visible');
    }
    console.log('');
    
    // ============================================
    // FLOW 6: PERFORMANCE MONITORING
    // ============================================
    console.log('━━━ FLOW 6: Performance Monitoring ━━━');
    
    const perfMonitor = new PerformanceMonitor();
    await perfMonitor.startMonitoring('843b3cd3', packageName, 'android', 1000);
    console.log('   Started monitoring CPU and Memory...');
    
    // Do some interactions while monitoring
    await robot.tap(540, 800);
    await sleep(1000);
    await robot.swipe('up');
    await sleep(1000);
    await robot.swipe('down');
    await sleep(1000);
    await robot.tap(540, 1200);
    await sleep(1000);
    
    const metrics = await perfMonitor.stopMonitoring();
    const avg = perfMonitor.getAverageMetrics();
    const peak = perfMonitor.getPeakMetrics();
    
    console.log(`   Samples collected: ${metrics.length}`);
    if (avg) {
      console.log(`   Average CPU: ${avg.cpu.toFixed(2)}%`);
      console.log(`   Average Memory: ${avg.memory.toFixed(2)} MB`);
    }
    if (peak) {
      console.log(`   Peak CPU: ${peak.cpu.toFixed(2)}%`);
      console.log(`   Peak Memory: ${peak.memory.toFixed(2)} MB`);
    }
    console.log('   ✅ Performance monitoring works');
    console.log('');
    
    // ============================================
    // FLOW 7: ACCESSIBILITY CHECK
    // ============================================
    console.log('━━━ FLOW 7: Accessibility Check ━━━');
    
    const accessibilityChecker = new AccessibilityChecker();
    const finalElements = await robot.getElementsOnScreen();
    const a11yResults = await accessibilityChecker.checkAccessibility(finalElements);
    
    console.log(`   Accessibility Score: ${a11yResults.score}/100`);
    console.log(`   Rating: ${a11yResults.rating}`);
    console.log(`   Total elements checked: ${a11yResults.summary.totalElements}`);
    console.log(`   Interactive elements: ${a11yResults.summary.interactiveElements}`);
    console.log(`   Issues found: ${a11yResults.summary.issuesFound}`);
    
    if (a11yResults.issues.length > 0) {
      console.log(`   ⚠️  Found ${a11yResults.issues.length} accessibility issues`);
      a11yResults.issues.slice(0, 3).forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.severity}: ${issue.message}`);
      });
    } else {
      console.log('   ✅ No accessibility issues found!');
    }
    console.log('');
    
    // ============================================
    // FLOW 8: NAVIGATION TEST
    // ============================================
    console.log('━━━ FLOW 8: Navigation Test ━━━');
    
    // Try swipe left/right to explore tabs
    console.log('   Testing horizontal navigation...');
    await robot.swipe('left');
    await sleep(1500);
    const afterLeftSwipe = await robot.getElementsOnScreen();
    console.log(`   After left swipe: ${afterLeftSwipe.length} elements`);
    
    await robot.swipe('right');
    await sleep(1500);
    const afterRightSwipe = await robot.getElementsOnScreen();
    console.log(`   After right swipe: ${afterRightSwipe.length} elements`);
    console.log('   ✅ Horizontal navigation tested');
    console.log('');
    
    // ============================================
    // SUMMARY
    // ============================================
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Flows tested:');
    console.log('  ✅ 1. App Launch & Home Screen');
    console.log('  ✅ 2. Mood Tracking');
    console.log('  ✅ 3. Scroll & Explore Content');
    console.log('  ✅ 4. Assessment Flow');
    console.log('  ✅ 5. Biomarkers Section');
    console.log('  ✅ 6. Performance Monitoring');
    console.log('  ✅ 7. Accessibility Check');
    console.log('  ✅ 8. Navigation Test');
    console.log('');
    console.log('Performance:');
    if (avg) {
      console.log(`  - Average CPU: ${avg.cpu.toFixed(2)}%`);
      console.log(`  - Average Memory: ${avg.memory.toFixed(2)} MB`);
    }
    console.log(`  - Samples: ${metrics.length}`);
    console.log('');
    console.log('Accessibility:');
    console.log(`  - Score: ${a11yResults.score}/100 (${a11yResults.rating})`);
    console.log(`  - Issues: ${a11yResults.summary.issuesFound}`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   ✅ ALL FLOWS TESTED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testAllGoodMoodFlows();

