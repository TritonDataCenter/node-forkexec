/*
 * lib/forkexec.js: sane child process library
 */

var mod_assertplus = require('assert-plus');
var mod_child = require('child_process');
var VError = require('verror');

exports.forkExecWait = forkExecWait;

/*
 * forkExecWait(args, callback): similar to Node's child_process.execFile()
 * except that the "argv" is specified more like in other environments and the
 * returned Error is more descriptive.
 *
 * Arguments (properties of "args"):
 *
 *     argv			Command-line arguments, including the command
 *     (array of string)	itself (as you would in C, but different than
 *     				Node's spawn() and execFile()).  This will
 *     				exec'd directly (a la "child_process.execFile"),
 *     				not via "bash -c" (as with
 *     				"child_process.exec").
 *
 *     timeout			See child_process.execFile().
 *     (int: milliseconds)	"killSignal" is always provided as SIGKILL.
 *
 *     cwd (string)		See child_process.execFile().
 *     encoding (string)	See child_process.execFile().
 *     env (object)		See child_process.execFile().
 *     maxBuffer (int)		See child_process.execFile().
 *     uid (int)		See child_process.execFile().
 *     gid (int)		See child_process.execFile().
 *
 * "callback" is invoked as "callback(err, info)", where "info" includes:
 *
 *     error	The same as the "error" argument to the callback.  This is
 *     		"null" if the child process was successfully forked, the command
 *     		terminated normally (i.e., not by a signal), and exited with a
 *     		status 0.  If any of these isn't true, "error" is non-null with
 *     		a descriptive message.  See the summary on "Checking for errors"
 *     		below.
 *
 *     status   If the process exited normally (i.e., it was not terminated
 *     		by a signal), this is the exit status of the process.
 *     		Otherwise, this field is null.  (Node calls this "code", but
 *     		doesn't supply it on success.  Additionally, "code" is
 *     		overloaded to mean other things.  Both POSIX and the OS call
 *     		this field "status".)
 *
 *     signal	If the process was terminated by a signal, then this is the name
 *     		of the signal that terminated it.  Otherwise, this field is
 *     		null.
 *
 *     stdout	See child_process.execFile().
 *     stderr	See child_process.execFile().
 *
 * Checking for errors: there are four possible outcomes from this command:
 *
 *     (1) Node failed to fork/exec the child process at all.
 *         (error is non-null, status is null, and signal is null)
 *
 *     (2) The child process was successfully forked and exec'd, but terminated
 *         abnormally due to a signal.
 *         (error is non-null, status is null, and signal is non-null)
 *
 *     (3) The child process was successfully forked and exec'd and exited
 *         with a status code other than 0.
 *         (error is non-null, status is an integer, and signal is null).
 *
 *     (4) The child process was successfully forked and exec'd and exited with
 *         a status code of 0.
 *         (error is null, status is 0, and signal is null.)
 *
 * While this interface allows callers to easily tell which case occurred,
 * most programs only need to think of this as either success (case (4)) or
 * failure (cases (1) through (3)).  This corresponds exactly to whether "error"
 * is non-null.  Generating a descriptive error message for the three error
 * cases is non-trivial.  You should probably just use the message provided on
 * the Error.
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
