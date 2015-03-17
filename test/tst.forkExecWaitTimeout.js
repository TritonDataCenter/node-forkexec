var assert = require('assert-plus');
var forkExecWait = require('../lib/forkexec').forkExecWait;

var done = false;
process.on('exit', function () { assert.ok(done); });

forkExecWait({
    'argv': [ 'sleep', '2' ],
    'timeout': 1000
}, function (err, info) {
	console.log(info);
	assert.ok(!done);
	done = true;
	assert.ok(err instanceof Error);
	assert.ok(info.error == err);
	assert.equal(err.message,
	    'exec "sleep 2": unexpectedly terminated by signal SIGKILL');
	assert.ok(info.status === null);
	assert.equal(info.signal, 'SIGKILL');
	assert.ok(info.stdout === '');
	assert.ok(info.stderr === '');
});
