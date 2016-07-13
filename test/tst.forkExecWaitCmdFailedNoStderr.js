var assert = require('assert-plus');
var path = require('path');
var forkExecWait = require('../lib/forkexec').forkExecWait;

var done = false;
process.on('exit', function () { assert.ok(done); });

var program = path.join(__dirname, '..', 'tools', 'failer');

forkExecWait({
    'argv': [ program ],
    'includeStderr': false
}, function (err, info) {
	console.log(info);
	assert.ok(!done);
	done = true;
	assert.ok(err instanceof Error);
	assert.ok(info.error == err);
	assert.equal(err.message, 'exec "' + program + '": exited with ' +
	    'status 23');
	assert.equal(info.status, 23);
	assert.ok(info.signal === null);
	assert.ok(info.stdout === '');
	assert.equal(info.stderr, 'He has killed me, mother.\n');
});
