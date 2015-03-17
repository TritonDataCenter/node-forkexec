var assert = require('assert-plus');
var forkExecWait = require('../lib/forkexec').forkExecWait;

var done = false;
process.on('exit', function () { assert.ok(done); });

forkExecWait({
    'argv': [ '/dev/null' ]
}, function (err, info) {
	console.log(info);
	assert.ok(!done);
	done = true;
	assert.ok(err instanceof Error);
	assert.ok(info.error == err);
	/* JSSTYLED */
	assert.ok(/^exec "\/dev\/null":/.test(err.message));
	assert.ok(info.status === null);
	assert.ok(info.signal === null);
	assert.ok(info.stdout === '');
	assert.ok(info.stderr === '');
});
