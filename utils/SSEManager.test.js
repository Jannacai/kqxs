// SSEManager.test.js - Test file cho SSEManager
import sseManager from './SSEManager';

// Test basic functionality
console.log('🧪 Testing SSEManager...');

// Test 1: Check if manager is created
console.log('✅ SSEManager created:', !!sseManager);

// Test 2: Check live schedule
console.log('📅 Live Schedule:', sseManager.liveSchedule);

// Test 3: Check if regions are live
const now = new Date();
const currentTime = now.toTimeString().slice(0, 5);
console.log('🕐 Current time:', currentTime);

Object.keys(sseManager.liveSchedule).forEach(region => {
    const isLive = sseManager.isRegionLive(region);
    console.log(`📡 ${region}: ${isLive ? 'LIVE' : 'NOT LIVE'}`);
});

// Test 4: Get stats
console.log('📊 Stats:', sseManager.getStats());

// Test 5: Subscribe test (mock)
let testCallbackCalled = false;
const testCallback = (data) => {
    console.log('📡 Test callback received:', data);
    testCallbackCalled = true;
};

const unsubscribe = sseManager.subscribe('xsmb', testCallback);
console.log('✅ Subscribe test completed');

// Test 6: Unsubscribe test
unsubscribe();
console.log('✅ Unsubscribe test completed');

console.log('🎉 All tests completed!'); 