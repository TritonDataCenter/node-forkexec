var assert = require('assert-plus');
var forkExecWait = require('../lib/forkexec').forkExecWait;

var done = false;
process.on('exit', function () { assert.ok(done); });

forkExecWait({
    'argv': [ 'echo', 'hello', 'world' ]
}, function (err, info) {
	console.log(info);
	assert.ok(!done);
	done = true;
	assert.ok(err === null);
	assert.ok(info.error === null);
	assert.ok(info.status === 0);
	assert.ok(info.signal === null);
	assert.ok(info.stdout === 'hello world\n');
	assert.ok(info.stderr === '');
});
