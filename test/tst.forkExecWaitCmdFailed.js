var assert = require('assert-plus');
var forkExecWait = require('../lib/forkexec').forkExecWait;

var done = false;
process.on('exit', function () { assert.ok(done); });

forkExecWait({
    'argv': [ 'grep', 'foobar', '/nonexistent_file' ]
}, function (err, info) {
	console.log(info);
	assert.ok(!done);
	done = true;
	assert.ok(err instanceof Error);
	assert.ok(info.error == err);
	assert.equal(err.message,
	    'exec "grep foobar /nonexistent_file": exited with status 2');
	assert.equal(info.status, 2);
	assert.ok(info.signal === null);
	assert.ok(info.stdout === '');
	assert.equal(info.stderr,
	    'grep: /nonexistent_file: No such file or directory\n');
});
