/* See README.md */
var forkExecWait = require('../lib/forkexec').forkExecWait;
forkExecWait({
    'argv': [ '/dev/null' ]
}, function (err, info) {
	console.log(info);
});
