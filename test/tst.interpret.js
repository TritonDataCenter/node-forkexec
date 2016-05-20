var assert = require('assert-plus');
var interpret = require('../lib/forkexec').interpretChildProcessResult;

var test_cases = [ {
    'name': 'missing arguments',
    'args': [ ],
    'throws': /args \(object\) is required/
}, {
    'name': 'bad arguments',
    'args': [ false ],
    'throws': /args \(object\) is required/
}, {
    'name': 'missing label',
    'args': [ { 'error': new Error() } ],
    'throws': /args\.label \(string\) is required/
}, {
    'name': 'non-Error',
    'args': [ { 'label': 'mycmd', 'error': {} } ],
    'throws': /child_process function returned non-null, non-Error/
}, {
    'name': 'success case',
    'args': [ { 'label': 'mycmd', 'error': null } ],
    'expect': {
	'error': null,
	'status': 0,
	'signal': null
    }
}, {
    'name': 'failed to exec',
    'args': [ { 'label': 'mycmd', 'error': new Error('failed to exec') } ],
    'expect': {
	'error': /^exec mycmd: failed to exec$/,
	'status': null,
	'signal': null
    }
}, {
    'name': 'terminated with non-zero status',
    'args': [ { 'label': 'mycmd', 'error': new Error('blah blah') } ],
    'prerun': function (args) {
	args[0].error.code = 3;
    },
    'expect': {
	'error': /^exec mycmd: exited with status 3$/,
	'status': 3,
	'signal': null
    }
}, {
    'name': 'terminated by signal',
    'args': [ { 'label': 'mycmd', 'error': new Error('blah blah') } ],
    'prerun': function (args) {
	args[0].error.signal = 'SIGKILL';
    },
    'expect': {
	'error': /^exec mycmd: unexpectedly terminated by signal SIGKILL$/,
	'status': null,
	'signal': 'SIGKILL'
    }
} ];

test_cases.forEach(function (tc) {
	var rv, exn;

	console.error('test case: %s', tc.name);

	assert.object(tc);
	assert.string(tc.name, 'tc.name');
	assert.ok(Array.isArray(tc.args), 'tc.args is an array');
	if (tc.throws) {
		assert.ok(tc.throws instanceof RegExp);
		assert.ok(!tc.hasOwnProperty('expect'));
	} else {
		assert.object(tc.expect);
		assert.ok(tc.expect.error === null ||
		    tc.expect.error instanceof RegExp);
		assert.ok(tc.expect.status === null ||
		    typeof (tc.expect.status) == 'number');
		assert.ok(tc.expect.signal === null ||
		    typeof (tc.expect.signal) == 'string');
		/*
		 * At least one of "signal" or "status" must be null.
		 * It's possible for both to be null.
		 */
		assert.ok(tc.expect.signal === null ||
		    tc.expect.status === null);
	}

	if (tc.prerun) {
		tc.prerun(tc.args);
	}

	try {
		rv = interpret.apply(null, tc.args);
	} catch (ex) {
		exn = ex;
	}

	if (exn !== undefined) {
		assert.ok(tc.throws,
		    'unexpected exception: ' + exn.message);
		assert.ok(tc.throws.test(exn.message),
		    'non-matching exception: ' + exn.message);
		return;
	}

	assert.ok(!tc.throws, 'expected exception!');
	assert.ok(tc.expect.status === rv.status, 'incorrect status');
	assert.ok(tc.expect.signal === rv.signal, 'incorrect signal');
	if (tc.expect.error !== null) {
		assert.ok(tc.expect.error.test(rv.error.message),
		    'incorrect error message');
	} else {
		assert.ok(rv.error === null, 'found unexpected error');
	}
});
