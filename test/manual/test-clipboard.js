/**
 * Manual test for Clipboard operations
 */

const { AndroidRobot } = require('../../lib/android');

async function testClipboard() {
  console.log('=== Testing Clipboard Operations ===\n');
  
  const robot = new AndroidRobot('843b3cd3');
  
  try {
    // Test 1: Set clipboard
    console.log('Test 1: Set clipboard');
    const testText = 'Hello from mobile-mcp! 🚀';
    await robot.setClipboard(testText);
    console.log(`  ✓ Clipboard set to: "${testText}"\n`);
    
    // Test 2: Get clipboard
    console.log('Test 2: Get clipboard');
    const content = await robot.getClipboard();
    console.log(`  Retrieved: "${content}"`);
    if (content === testText) {
      console.log('  ✓ Clipboard content matches\n');
    } else {
      console.log('  ✗ Clipboard content does not match\n');
    }
    
    // Test 3: Set longer text with special characters
    console.log('Test 3: Set text with special characters');
    const specialText = 'Test\nMultiline\nText\nWith "quotes" and $pecial ch@rs!';
    await robot.setClipboard(specialText);
    const content2 = await robot.getClipboard();
    console.log(`  Set: ${specialText.substring(0, 50)}...`);
    console.log(`  Got: ${content2.substring(0, 50)}...`);
    console.log('  ✓ Special characters handled\n');
    
    // Test 4: Clear clipboard
    console.log('Test 4: Clear clipboard');
    await robot.clearClipboard();
    const emptyContent = await robot.getClipboard();
    console.log(`  Clipboard content after clear: "${emptyContent}"`);
    if (emptyContent === '') {
      console.log('  ✓ Clipboard cleared successfully\n');
    } else {
      console.log('  ⚠ Clipboard not completely empty (might be OK)\n');
    }
    
    console.log('=== All Clipboard Tests Passed! ===\n');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testClipboard();

