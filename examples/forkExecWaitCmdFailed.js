/* See README.md */
var forkExecWait = require('../lib/forkexec').forkExecWait;
forkExecWait({
    'argv': [ 'grep', 'foobar', '/nonexistent_file' ]
}, function (err, info) {
	console.log(info);
});
