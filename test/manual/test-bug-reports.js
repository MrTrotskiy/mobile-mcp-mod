/**
 * Manual Test: Bug Report Generator
 * 
 * Tests bug report generation on Android device
 * 
 * Usage:
 * 1. Make sure app is open on device
 * 2. Run: node test/manual/test-bug-reports.js
 */

const { AndroidRobot } = require('../../lib/android');
const { BugReportGenerator } = require('../../lib/bug-report-generator');
const fs = require('fs');
const path = require('path');

const DEVICE_ID = '843b3cd3';
const PACKAGE_NAME = 'com.goodmood.app';

async function main() {
  console.log('🐛 Starting Bug Report Generator Testing...\n');
  
  const robot = new AndroidRobot(DEVICE_ID);
  const generator = new BugReportGenerator();
  
  try {
    // Test 1: Quick Bug Report
    console.log('Test 1: Creating quick bug report...');
    const quickReport = await generator.createQuickReport(
      robot,
      'Login Button Not Responding',
      'When tapping the login button, nothing happens. The button appears clickable but does not trigger any action.',
      DEVICE_ID,
      'android',
      PACKAGE_NAME
    );
    
    const quickPath = await generator.save(quickReport, 'markdown');
    console.log(`✅ Quick report created: ${quickReport.reportId}`);
    console.log(`   Saved to: ${quickPath}\n`);
    
    // Test 2: Comprehensive Bug Report
    console.log('Test 2: Creating comprehensive bug report...');
    const elements = await robot.getElementsOnScreen();
    
    const fullReport = await generator.createReport(robot, {
      title: 'App Crashes on Submit',
      description: 'Application crashes when submitting the form with special characters in the email field.',
      severity: 'critical',
      stepsToReproduce: [
        'Open the app',
        'Navigate to sign up page',
        'Enter email with special characters (e.g., test+user@example.com)',
        'Tap Submit button',
        'App crashes immediately'
      ],
      expectedBehavior: 'App should accept emails with special characters and proceed to next step',
      actualBehavior: 'App crashes with no error message',
      deviceId: DEVICE_ID,
      platform: 'android',
      packageName: PACKAGE_NAME,
      includeScreenshot: true,
      includeLogs: false,
      includeElementHierarchy: true,
      reportedBy: 'Automated Test'
    });
    
    const fullPath = await generator.save(fullReport, 'markdown');
    console.log(`✅ Comprehensive report created: ${fullReport.reportId}`);
    console.log(`   Severity: 🔴 ${fullReport.severity.toUpperCase()}`);
    console.log(`   Screenshot: ${fullReport.screenshot ? '✓' : '✗'}`);
    console.log(`   Element Hierarchy: ${fullReport.elementHierarchy ? `✓ (${fullReport.elementHierarchy.length} elements)` : '✗'}`);
    console.log(`   Saved to: ${fullPath}\n`);
    
    // Test 3: Bug Report with Different Severities
    console.log('Test 3: Creating bug reports with different severities...');
    
    const severities = ['critical', 'high', 'medium', 'low'];
    const reportIds = [];
    
    for (const severity of severities) {
      const report = await generator.createReport(robot, {
        title: `${severity.toUpperCase()} Severity Test`,
        description: `This is a test bug report with ${severity} severity`,
        severity: severity,
        stepsToReproduce: ['Step 1', 'Step 2'],
        expectedBehavior: 'Expected behavior',
        actualBehavior: 'Actual behavior',
        deviceId: DEVICE_ID,
        platform: 'android',
        packageName: PACKAGE_NAME,
        includeScreenshot: false,
        reportedBy: 'Test Suite'
      });
      
      await generator.save(report, 'markdown');
      reportIds.push(report.reportId);
      
      const emoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢'
      };
      console.log(`   ${emoji[severity]} ${severity.toUpperCase()}: ${report.reportId}`);
    }
    
    console.log(`\n✅ Created ${severities.length} reports with different severities\n`);
    
    // Test 4: JSON Format
    console.log('Test 4: Testing JSON format export...');
    const jsonReport = await generator.createQuickReport(
      robot,
      'JSON Format Test',
      'Testing JSON export format',
      DEVICE_ID,
      'android',
      PACKAGE_NAME
    );
    
    const jsonPath = await generator.save(jsonReport, 'json');
    console.log(`✅ JSON report created: ${jsonReport.reportId}`);
    console.log(`   Saved to: ${jsonPath}\n`);
    
    // Verify JSON format
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(jsonContent);
    console.log(`   Verified: Valid JSON with ${Object.keys(parsed).length} top-level fields\n`);
    
    // Test 5: Read and Display Report
    console.log('Test 5: Reading and displaying markdown report...');
    const mdContent = fs.readFileSync(quickPath, 'utf-8');
    const firstLines = mdContent.split('\n').slice(0, 15).join('\n');
    console.log('   First 15 lines of report:');
    console.log('   ' + '─'.repeat(58));
    firstLines.split('\n').forEach(line => {
      console.log('   ' + line);
    });
    console.log('   ' + '─'.repeat(58));
    console.log('');
    
    // Summary
    console.log('=' .repeat(60));
    console.log('📊 SUMMARY');
    console.log('=' .repeat(60));
    console.log('✅ All bug report tests passed!');
    console.log(`\nBug reports saved to: test/bug-reports/`);
    console.log('\nFeatures tested:');
    console.log('  ✓ Quick bug report generation');
    console.log('  ✓ Comprehensive bug report with screenshots');
    console.log('  ✓ Element hierarchy capture');
    console.log('  ✓ Multiple severity levels');
    console.log('  ✓ Markdown format export');
    console.log('  ✓ JSON format export');
    console.log('  ✓ Automatic report ID generation');
    
    // List all generated reports
    const reportsDir = path.join(__dirname, '../../test/bug-reports');
    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.md') || f.endsWith('.json'));
      console.log(`\n📁 Total reports in directory: ${files.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  }
}

main();

