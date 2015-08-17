var testrunner = require("qunit");
testrunner.run({
    code: {path: "jsrender-node.js", namespace: "jsrender"}, // exports require('jsrender')
    tests: "test/unit-tests/tests-jsrender-no-jquery.js"
});

testrunner.run({
    code: {path: "jsrender-node.js", namespace: "jsrender"}, // exports require('jsrender')
    tests: "test/unit-tests/tests-jsrender-node.js"
});
