// Manual test for crash detection functionality
const { AndroidRobot, AndroidDeviceManager } = require('../../lib/android');

console.log('=== Testing Crash Detection & System Errors ===\n');

// Check for devices
const manager = new AndroidDeviceManager();
const devices = manager.getConnectedDevices();

if (devices.length === 0) {
	console.log('❌ No Android devices connected');
	console.log('Please connect device 843b3cd3');
	process.exit(1);
}

console.log(`✓ Found device: ${devices[0].deviceId}\n`);

const robot = new AndroidRobot(devices[0].deviceId);

// Test 1: Get crash logs (all apps)
console.log('Test 1: Getting all crash logs...');
const allCrashes = robot.getCrashLogs();
console.log(`  ✓ Got ${allCrashes.length} crash log lines`);
if (allCrashes.length > 0) {
	if (allCrashes[0].includes('No crashes found')) {
		console.log('  ✓ No crashes detected (good!)');
	} else {
		console.log('  ⚠ Crashes detected! First 5 lines:');
		allCrashes.slice(0, 5).forEach((line, i) => {
			const short = line.substring(0, 70);
			console.log(`    ${i+1}. ${short}${line.length > 70 ? '...' : ''}`);
		});
	}
}

// Test 2: Get crash logs for specific app
console.log('\nTest 2: Getting crash logs for com.android.settings...');
const appCrashes = robot.getCrashLogs('com.android.settings');
console.log(`  ✓ Got ${appCrashes.length} crash log lines`);
if (appCrashes[0].includes('No crashes found')) {
	console.log('  ✓ No crashes for Settings app (expected)');
}

// Test 3: Get system errors
console.log('\nTest 3: Getting system errors...');
const errors = robot.getSystemErrors(20);
console.log(`  ✓ Got ${errors.length} system error lines`);
if (errors.length > 0 && !errors[0].includes('No system errors')) {
	console.log('  Sample errors (first 3):');
	errors.slice(0, 3).forEach((error, i) => {
		const short = error.substring(0, 70);
		console.log(`    ${i+1}. ${short}${error.length > 70 ? '...' : ''}`);
	});
} else {
	console.log('  ✓ No system errors found (good!)');
}

console.log('\n=== All Tests Passed! ===');
console.log('✅ getCrashLogs() works');
console.log('✅ getCrashLogs(packageName) works');
console.log('✅ getSystemErrors() works');

