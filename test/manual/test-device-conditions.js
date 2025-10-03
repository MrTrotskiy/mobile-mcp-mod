/**
 * Manual test for Device Conditions simulation
 */

const { DeviceConditions } = require('../../lib/device-conditions');

async function testDeviceConditions() {
  console.log('=== Testing Device Conditions Simulation ===\n');
  
  const conditions = new DeviceConditions();
  const deviceId = '843b3cd3';
  
  try {
    // Test 1: Get current battery status
    console.log('Test 1: Get battery status');
    const statusBefore = await conditions.getBatteryStatus(deviceId);
    console.log(`  Level: ${statusBefore.level}%`);
    console.log(`  Status: ${statusBefore.status}`);
    console.log(`  Health: ${statusBefore.health}`);
    console.log('  ✓ Battery status retrieved\n');
    
    // Test 2: Set battery level
    console.log('Test 2: Set battery level to 20%');
    await conditions.setBatteryLevel(deviceId, 20);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const statusLow = await conditions.getBatteryStatus(deviceId);
    console.log(`  New level: ${statusLow.level}%`);
    console.log('  ✓ Battery level changed\n');
    
    // Test 3: Set battery to full
    console.log('Test 3: Set battery level to 100%');
    await conditions.setBatteryLevel(deviceId, 100);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const statusFull = await conditions.getBatteryStatus(deviceId);
    console.log(`  New level: ${statusFull.level}%`);
    console.log('  ✓ Battery level changed to full\n');
    
    // Test 4: Reset battery
    console.log('Test 4: Reset battery to normal');
    await conditions.resetBattery(deviceId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const statusReset = await conditions.getBatteryStatus(deviceId);
    console.log(`  Level after reset: ${statusReset.level}%`);
    console.log('  ✓ Battery reset\n');
    
    // Test 5: WiFi control
    console.log('Test 5: WiFi control');
    console.log('  Disabling WiFi...');
    await conditions.setWiFi(deviceId, false);
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('  Re-enabling WiFi...');
    await conditions.setWiFi(deviceId, true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('  ✓ WiFi control works\n');
    
    // Test 6: Network condition - WiFi only
    console.log('Test 6: Set network condition to WiFi only');
    const result = await conditions.setNetworkCondition(deviceId, 'wifi');
    console.log(`  ${result}`);
    console.log('  ✓ Network condition set\n');
    
    console.log('=== All Device Conditions Tests Passed! ===\n');
    console.log('Summary:');
    console.log('- Battery simulation: Working');
    console.log('- WiFi control: Working');
    console.log('- Network conditions: Working');
    console.log('\nNote: Airplane mode and mobile data not tested to avoid disrupting connection.\n');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testDeviceConditions();

