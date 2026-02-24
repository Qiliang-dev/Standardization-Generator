const assert = require("assert");
const { parsePastedText } = require("./parser");

// Fixture 1: minimal labels (bug report)
const fixture1 = `Choose the dark mode, the interface in CID should be dark

Observed Behavior:
Its still bright

Recovery possible? If yes, detail steps:
No

Test case ID:
IDCEVODEV-476845
`;

const res1 = parsePastedText(fixture1);
assert.strictEqual(res1.expected, undefined);
assert.strictEqual(res1.observed, "Its still bright");
assert.strictEqual(res1.recovery, "No");
assert.strictEqual(res1.testCaseId, "IDCEVODEV-476845");
assert.ok(res1.issueDescription);

// Fixture 2: full bug report labels
const fixture2 = `Issue Description: Dark mode is not work
Tested SW Version:
Rack: Testrack Ruko 2
IDCevo SW: bmw_idcevo-userdebug 14 idcevo_b1-pu2607-26w05.7-1
PDX Version (only if PDX was tested):
- link1
- link2
Observed Behavior: still bright
Expected Behavior: CID should be dark
Steps to reproduce:
1. Step one
2. Step two
`;

const res2 = parsePastedText(fixture2);
assert.ok(res2.issueDescription.startsWith("Dark mode"));
assert.strictEqual(res2.rack, "Testrack Ruko 2");
assert.ok(res2.idcevo.includes("bmw_idcevo-userdebug"));
assert.ok(res2.pdx.includes("link1"));
assert.strictEqual(res2.observed, "still bright");
assert.strictEqual(res2.expected, "CID should be dark");
assert.ok(res2.steps.startsWith("Step one"));

console.log("parser bug fixtures passed");

// Fixture 3: legacy test doku
const fixture3 = `Rack/Vehicle:
CE_SP25_21
APK Version:
2507.2530.2
Mobile Devices:
iPhone 16 Pro (iOS-Version: 18.5)
Galaxy S25 (Android-Version: 15)
Test Results:
Total: 207
Passed: 167
Failed: 0
Aborted: 40
Findings:
No Performance related issues detected.

New created tickets:
Outgoing call ... ---> IDCEVODEV-598226
Already existing tickets:
Incoming call ... ---> IDCEVODEV-578119
Aborted:
4 Speedlock tests
`;

const res3 = parsePastedText(fixture3, { mode: "test" });
assert.strictEqual(res3.rackVehicle, "CE_SP25_21");
assert.strictEqual(res3.apkVersion, "2507.2530.2");
assert.ok(res3.mobileDevices.includes("iPhone 16 Pro"));
assert.strictEqual(res3.testTotal, "207");
assert.strictEqual(res3.testPassed, "167");
assert.strictEqual(res3.testFailed, "0");
assert.strictEqual(res3.testAborted, "40");
assert.ok(res3.findings.includes("No Performance"));
assert.ok(res3.newTickets.includes("IDCEVODEV-598226"));
assert.ok(res3.existingTickets.includes("IDCEVODEV-578119"));
assert.ok(res3.abortedList.includes("Speedlock"));

console.log("parser legacy test doku passed");

// Fixture 4: updated test doku format
const fixture4 = `CW07

Wednesday: Two Resources: Qiliang Yu  & Seeta Desaraju

Test Task:
Adhoc: Performance tests for Video Call
IDCEVODEV-868113 Adhoc: Performance Tests for VideoCall to compare CPU load with Dingtalk - CodeCraft Jira
Platform:
G70, V-721713, EMEA INT
VIN: WBY61HY090CV46920
SW:
Zoom for Cars 1.0.8.6RC7 (IDC/CDE)
Zoom for Cars 1.0.8.6RC4 (RSE)
IDCevo: idcevo_b1-pu2607-26W06.2-2
RSE: 2607_i480-26w06.7-1
CDE: 2607_i480-26w06.7-2
MD´s:
Iphone 14 Plus - iOS 26.2
iPhone 16 Pro - iOS 26.2
Xiaomi 13T Pro - Android 15
Galaxy S24 - Android 16
Findings:
No Performance related issues detected.
`;

const res4 = parsePastedText(fixture4, { mode: "test" });
assert.strictEqual(res4.cwWeek, "CW07");
assert.ok((res4.resourceInfo || "").includes("Two Resources"));
assert.ok((res4.testTask || "").includes("Performance tests for Video Call"));
assert.strictEqual(res4.platform, "G70, V-721713, EMEA INT");
assert.strictEqual(res4.vin, "WBY61HY090CV46920");
assert.ok((res4.swDetails || "").includes("Zoom for Cars 1.0.8.6RC7"));
assert.ok((res4.mobileDevices || "").includes("iPhone 16 Pro"));
assert.ok((res4.findings || "").includes("No Performance"));

console.log("parser updated test doku passed");
