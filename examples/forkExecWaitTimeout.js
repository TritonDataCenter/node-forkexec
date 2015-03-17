/* See README.md */
var forkExecWait = require('../lib/forkexec').forkExecWait;
forkExecWait({
    'argv': [ 'sleep', '2' ],
    'timeout': 1000
}, function (err, info) {
	console.log(info);
});
