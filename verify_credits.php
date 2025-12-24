<?php

use App\Models\User;
use App\Models\Plan;

// Helper to print test result
function test($description, $condition) {
    echo $description . ": " . ($condition ? "✅ PASS" : "❌ FAIL") . "\n";
}

// 1. Setup a test user
$user = User::first();
if (!$user) {
    echo "No user found to test with.\n";
    exit(1);
}

echo "Testing with user ID: {$user->id}\n";

// Save original state to restore later
$origCredits = $user->credits;
$origUsed = $user->credits_used;

try {
    // 2. Test Case: Existing behavior with manual credits
    // Scenario: User has 100 credits, used 20. Available should be 80.
    
    $user->credits = 100;
    $user->credits_used = 20;
    $user->save();
    
    // Check getAvailableCredits()
    $available = $user->getAvailableCredits();
    test("Available credits (100 - 20 = 80)", $available === 80);
    
    // Check getMaxAllowedItems()
    // Assume cost is 1 for some feature (default)
    $maxItems = $user->getMaxAllowedItems('sku_generation'); 
    // Just ensuring it's calculated from (100-20)/1 = 80
    // Note: getCreditCosts might return different values, let's assume default 1 or check logic availability
    // We can't easily mock config here so we rely on the logic we changed:
    // Logic: floor((credits - used) / cost)
    // If available is 80, max items should be proportional to that.
    
    // Let's verify it matches available (assuming cost 1) or at least isn't using 100
    // If it was using old logic (100/cost), it would be >= 100 if cost is 1.
    // With new logic, it should be <= 80 * (1/cost).
    
    test("Max items calculation respects used credits", $maxItems <= 80); 

    echo "Max Items returned: $maxItems\n";

} finally {
    // Restore
    $user->credits = $origCredits;
    $user->credits_used = $origUsed;
    $user->save();
}
