/**
 * Manual Test: Accessibility Checking
 * 
 * Tests accessibility checker on Android device 843b3cd3 with GoodMood app
 * 
 * Usage: node test/manual/test-accessibility.js
 */

const { AndroidRobot } = require('../../lib/android');
const { AccessibilityChecker } = require('../../lib/accessibility-checker');

const DEVICE_ID = '843b3cd3';
const PACKAGE_NAME = 'com.goodmood.app';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🧪 Starting Accessibility Testing...\n');
  
  const robot = new AndroidRobot(DEVICE_ID);
  const checker = new AccessibilityChecker();
  
  try {
    // Step 1: Launch GoodMood app
    console.log('📱 Step 1: Launching GoodMood app...');
    robot.launchApp(PACKAGE_NAME);
    await sleep(3000);
    console.log('✅ App launched\n');
    
    // Step 2: Get elements on screen
    console.log('📋 Step 2: Getting screen elements...');
    const elements = await robot.getElementsOnScreen();
    console.log(`✅ Found ${elements.length} elements on screen\n`);
    
    // Show sample elements
    console.log('Sample elements:');
    for (let i = 0; i < Math.min(5, elements.length); i++) {
      const el = elements[i];
      console.log(`  - ${el.type}: "${el.text || el.label || '(no text)'}" at (${el.rect.x}, ${el.rect.y})`);
    }
    console.log('');
    
    // Step 3: Run accessibility check
    console.log('🔍 Step 3: Running accessibility check...');
    const report = await checker.checkAccessibility(elements);
    console.log('✅ Accessibility check complete\n');
    
    // Step 4: Show score
    console.log('=' .repeat(60));
    console.log('📊 ACCESSIBILITY SCORE');
    console.log('=' .repeat(60));
    console.log(`Score: ${report.score}/100`);
    
    let emoji = '✅';
    let rating = 'Excellent';
    if (report.score < 50) {
      emoji = '❌';
      rating = 'Poor';
    } else if (report.score < 70) {
      emoji = '🟡';
      rating = 'Needs Improvement';
    } else if (report.score < 90) {
      emoji = '🟢';
      rating = 'Good';
    }
    console.log(`Rating: ${emoji} ${rating}\n`);
    
    // Step 5: Show summary
    console.log('Summary:');
    console.log(`- Total elements: ${report.totalElements}`);
    console.log(`- Interactive elements: ${report.interactiveElements}`);
    console.log(`- Issues found: ${report.issues.length}`);
    console.log(`  - 🔴 Critical: ${report.summary.critical}`);
    console.log(`  - 🟡 Warning: ${report.summary.warning}`);
    console.log(`  - ℹ️ Info: ${report.summary.info}`);
    console.log('');
    
    // Step 6: Show issues (first 5)
    if (report.issues.length > 0) {
      console.log('=' .repeat(60));
      console.log('🐛 ACCESSIBILITY ISSUES (first 5)');
      console.log('=' .repeat(60));
      
      for (let i = 0; i < Math.min(5, report.issues.length); i++) {
        const issue = report.issues[i];
        const severityEmoji = issue.severity === 'critical' ? '🔴' : 
                            issue.severity === 'warning' ? '🟡' : 'ℹ️';
        
        console.log(`\n${severityEmoji} Issue ${i + 1}/${Math.min(5, report.issues.length)}`);
        console.log(`Type: ${issue.type.replace(/_/g, ' ')}`);
        console.log(`Element: ${issue.element.type} "${issue.element.text || issue.element.label || '(no text)'}"`);
        console.log(`Location: (${issue.element.rect.x}, ${issue.element.rect.y}) - ${issue.element.rect.width}x${issue.element.rect.height}`);
        console.log(`Problem: ${issue.message}`);
        console.log(`Fix: ${issue.suggestion}`);
        if (issue.wcagGuideline) {
          console.log(`Standard: ${issue.wcagGuideline}`);
        }
      }
      
      if (report.issues.length > 5) {
        console.log(`\n... and ${report.issues.length - 5} more issues`);
      }
    } else {
      console.log('✅ No accessibility issues found!');
    }
    
    // Step 7: Full formatted report
    console.log('\n' + '=' .repeat(60));
    console.log('📄 FULL FORMATTED REPORT');
    console.log('=' .repeat(60));
    const formatted = checker.formatReport(report);
    console.log(formatted);
    
    // Step 8: Test filtering by issue type
    console.log('\n' + '=' .repeat(60));
    console.log('🔎 FILTERING BY ISSUE TYPE');
    console.log('=' .repeat(60));
    
    const issueTypes = ['missing_label', 'poor_label', 'small_touch_target', 'overlapping_elements', 'duplicate_labels'];
    
    for (const type of issueTypes) {
      const filtered = report.issues.filter(i => i.type === type);
      console.log(`\n${type.replace(/_/g, ' ')}: ${filtered.length} issue(s)`);
      if (filtered.length > 0) {
        for (let i = 0; i < Math.min(2, filtered.length); i++) {
          const issue = filtered[i];
          console.log(`  - ${issue.element.type} at (${issue.element.rect.x}, ${issue.element.rect.y})`);
        }
      }
    }
    
    console.log('\n✅ Accessibility testing complete!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  }
}

main();

