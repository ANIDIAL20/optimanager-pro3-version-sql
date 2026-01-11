
const assert = require('assert');

// The safeJSONParse function to test (copied from the planned implementation)
function safeJSONParse(text) {
    // 1. Try standard parsing first
    try {
        return JSON.parse(text);
    } catch (e) {
        // Continue to regex extraction
    }

    // 2. Extract JSON object using regex (handles markdown, random text before/after)
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error("Invalid JSON structure received from AI");
    }

    try {
        return JSON.parse(match[0]);
    } catch (e) {
        throw new Error("Failed to parse extracted JSON");
    }
}

// Test Cases
const tests = [
    {
        name: "Clean JSON",
        input: '{"key": "value"}',
        expected: { key: "value" }
    },
    {
        name: "Markdown JSON",
        input: '```json\n{"key": "value"}\n```',
        expected: { key: "value" }
    },
    {
        name: "Text before and after",
        input: 'Here is the JSON: {"key": "value"} Check it out.',
        expected: { key: "value" }
    },
    {
        name: "Nested JSON structure",
        input: 'Some text {"outer": {"inner": "value"}} more text',
        expected: { outer: { inner: "value" } }
    },
    {
        name: "Multiline JSON",
        input: `
    Here is the result:
    {
        "items": [
            1,
            2,
            3
        ]
    }
    End of result.
    `,
        expected: { items: [1, 2, 3] }
    }
];

// Run Tests
console.log("Running safeJSONParse Tests...\n");
let passed = 0;
let failed = 0;

tests.forEach(test => {
    try {
        const result = safeJSONParse(test.input);
        assert.deepStrictEqual(result, test.expected);
        console.log(`✅ ${test.name}: PASSED`);
        passed++;
    } catch (error) {
        console.error(`❌ ${test.name}: FAILED`);
        console.error(`   Input: ${test.input}`);
        console.error(`   Error: ${error.message}`);
        failed++;
    }
});

// Negative Tests
const negativeTests = [
    {
        name: "No JSON brackets",
        input: "Just some random text without curly braces."
    },
    {
        name: "Broken JSON",
        input: '{"key": "value" broken' // Opening brace but invalid syntax
    }
];

negativeTests.forEach(test => {
    try {
        safeJSONParse(test.input);
        console.error(`❌ ${test.name}: FAILED (Should have thrown error)`);
        failed++;
    } catch (e) {
        console.log(`✅ ${test.name}: PASSED (Correctly threw error: ${e.message})`);
        passed++;
    }
});

console.log(`\nSummary: ${passed} Passed, ${failed} Failed`);

if (failed > 0) process.exit(1);
