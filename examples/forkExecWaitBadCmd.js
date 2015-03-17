/* See README.md */
var forkExecWait = require('../lib/forkexec').forkExecWait;
forkExecWait({
    'argv': [ 'nonexistent', 'command' ]
}, function (err, info) {
	console.log(info);
});
