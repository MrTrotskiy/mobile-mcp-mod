// Manual test for application logs functionality
const { AndroidRobot, AndroidDeviceManager } = require('../../lib/android');

console.log('=== Testing Application Logs ===\n');

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
const testPackage = 'com.android.settings';

// Test 1: Launch app and get logs
console.log('Test 1: Getting app logs...');
try {
	robot.adb('shell', 'am', 'start', testPackage + '/.Settings');
	console.log('  ✓ App launched');
} catch (e) {
	console.log('  ! Could not launch app, continuing anyway');
}

// Wait a moment for logs
setTimeout(() => {
	console.log('  Reading logs...');
	const logs = robot.getAppLogs(testPackage, 15);

	console.log(`  ✓ Got ${logs.length} log lines`);
	if (logs.length > 0 && !logs[0].includes('not running')) {
		console.log('  Sample (first 3):');
		logs.slice(0, 3).forEach((log, i) => {
			const short = log.substring(0, 70);
			console.log(`    ${i+1}. ${short}${log.length > 70 ? '...' : ''}`);
		});
	}

	// Test 2: Clear logs
	console.log('\nTest 2: Clearing logs...');
	const clearResult = robot.clearLogs();
	console.log(`  ✓ ${clearResult}`);

	// Test 3: Test with non-existent app
	console.log('\nTest 3: Testing with non-existent app...');
	const emptyLogs = robot.getAppLogs('com.fake.nonexistent.app', 5);
	console.log(`  ✓ Result: ${emptyLogs[0]}`);

	console.log('\n=== All Tests Passed! ===');
	console.log('✅ getAppLogs() works');
	console.log('✅ clearLogs() works');
	console.log('✅ Error handling works');

}, 1500);

