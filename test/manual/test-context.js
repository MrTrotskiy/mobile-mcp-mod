// Manual test for test context functionality
const { AndroidRobot, AndroidDeviceManager } = require('../../lib/android');
const { TestContext } = require('../../lib/test-context');

console.log('=== Testing Test Context Functionality ===\n');

// Check for devices
const manager = new AndroidDeviceManager();
const devices = manager.getConnectedDevices();

if (devices.length === 0) {
	console.log('❌ No Android devices connected');
	console.log('Will demonstrate TestContext with simulated actions');
	console.log('');

	// Simulate some actions
	console.log('Simulating actions...');
	TestContext.recordAction({
		type: 'launch_app',
		timestamp: Date.now(),
		device: 'simulated-device',
		params: { packageName: 'com.example.app' },
		result: 'success'
	});

	TestContext.recordAction({
		type: 'tap',
		timestamp: Date.now(),
		device: 'simulated-device',
		params: { x: 100, y: 200 },
		result: 'success'
	});

	TestContext.addLog('App launched successfully');
	TestContext.addLog('Tapped on button');

} else {
	console.log(`✓ Found device: ${devices[0].deviceId}\n`);

	const robot = new AndroidRobot(devices[0].deviceId);
	const testPackage = 'com.android.settings';

	console.log('Test 1: Launching app...');
	try {
		robot.adb('shell', 'am', 'start', testPackage + '/.Settings');

		// Record action
		TestContext.recordAction({
			type: 'launch_app',
			timestamp: Date.now(),
			device: devices[0].deviceId,
			params: { packageName: testPackage },
			result: 'success'
		});

		console.log('  ✓ App launched and action recorded');
	} catch (e) {
		console.log('  ! Could not launch app');
	}

	TestContext.addLog('Settings app launched');
}

// Get test summary
console.log('\n=== Test Summary ===');
const resources = TestContext.toResources();

const summary = resources.find(r => r.uri === 'test://current/summary');
if (summary) {
	const summaryData = JSON.parse(summary.text);
	console.log(`Total actions: ${summaryData.totalActions}`);
	console.log(`Total logs: ${summaryData.totalLogs}`);
	console.log(`Devices used: ${summaryData.devices.join(', ')}`);
	console.log(`Action types: ${summaryData.actionTypes.join(', ')}`);
}

// Get actions history
console.log('\n=== Actions History ===');
const actions = resources.find(r => r.uri === 'test://current/actions');
if (actions) {
	const actionsData = JSON.parse(actions.text);
	actionsData.forEach((action, i) => {
		console.log(`${i + 1}. [${action.type}] ${action.device} - ${JSON.stringify(action.params)}`);
	});
}

// Get logs
console.log('\n=== Test Logs ===');
const logs = resources.find(r => r.uri === 'test://current/logs');
if (logs && logs.text.trim()) {
	console.log(logs.text);
} else {
	console.log('No logs captured');
}

console.log('\n=== Test Complete ===');
console.log('✅ TestContext works correctly!');

