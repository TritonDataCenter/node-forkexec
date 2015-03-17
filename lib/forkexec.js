/*
 * lib/forkexec.js: sane child process library
 */

var mod_assertplus = require('assert-plus');
var mod_child = require('child_process');
var VError = require('verror');

exports.forkExecWait = forkExecWait;

/*
 * forkExecWait(args, callback): similar to Node's child_process.execFile().
 * See README.md for interface details.
 */
function forkExecWait(args, callback)
{
	var cmd, cmdstr, cmdargs, options;
	var passthru, rv;

	mod_assertplus.object(args, 'args');
	mod_assertplus.arrayOfString(args.argv, 'args.argv');
	mod_assertplus.optionalString(args.cwd, 'args.cwd');
	mod_assertplus.optionalObject(args.env, 'args.env');
	mod_assertplus.optionalNumber(args.timeout, 'args.timeout');
	mod_assertplus.optionalNumber(args.maxBuffer, 'args.maxBuffer');
	mod_assertplus.optionalNumber(args.uid, 'args.uid');
	mod_assertplus.optionalNumber(args.gid, 'args.gid');

	cmd = args.argv[0];
	cmdstr = JSON.stringify(args.argv.join(' '));
	cmdargs = args.argv.slice(1);
	options = {};
	passthru = [ 'cwd', 'encoding', 'env', 'maxBuffer', 'uid', 'gid',
	    'timeout' ];
	passthru.forEach(function (field) {
		if (args.hasOwnProperty(field))
			options[field] = args[field];
	});

	if (options.hasOwnProperty('timeout'))
		options['killSignal'] = 'SIGKILL';

	/*
	 * Node returns most operational errors asynchronously here, but some
	 * are synchronous (like EACCES from exec(2)).  We want to make these
	 * asynchronous here.
	 */
	try {
		rv = mod_child.execFile(cmd, cmdargs, options,
		    function (error, stdout, stderr) {
			onChildExited(cmdstr, callback, error, stdout, stderr);
		    });
	} catch (ex) {
		rv = null;
		setImmediate(onChildExited, cmdstr, callback, ex, '', '');
	}

	return (rv);
}

function onChildExited(cmdstr, callback, error, stdout, stderr)
{
	var err, info;

	info = {
	    'error': null,
	    'status': null,
	    'signal': null,
	    'stdout': stdout,
	    'stderr': stderr
	};

	if (error === null) {
		info.status = 0;
		callback(null, info);
		return;
	}

	/*
	 * child_process.execFile() is documented to return either null
	 * or an instance of Error.
	 */
	mod_assertplus.ok(error instanceof Error,
	    'child_process.execFile() returned non-null, non-Error');
	if (error.signal) {
		/*
		 * We deliberately don't pass "error" to the VError
		 * constructor because the "message" on Node's error is
		 * non-idiomatic for Unix programs.
		 */
		err = new VError('unexpectedly terminated by signal %s',
		    error.signal);
		info.signal = error.signal;
	} else if (typeof (error.code) == 'number') {
		/* See above. */
		err = new VError('exited with status %d', error.code);
		info.status = error.code;
	} else {
		/*
		 * In this case, fork() or exec() probably failed.
		 * Neither "signal" nor "status" will be provided to the
		 * caller since no child process was created.  In this
		 * case, we use the underlying error as a cause because
		 * it may well be meaningful.
		 *
		 * Note that this kind of error can have a "code" on it,
		 * but it's not the status code of the program.  Node
		 * uses "code" on other kinds of errors.  That's why the
		 * previous condition checks whether "code" is a number,
		 * not just whether it's present.
		 */
		err = error;
	}

	mod_assertplus.ok(err instanceof Error);
	info.error = new VError(err, 'exec %s', cmdstr);
	callback(info.error, info);
}
