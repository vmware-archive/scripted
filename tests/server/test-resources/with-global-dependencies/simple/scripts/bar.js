console.log('Loading bar');
foo('from bar');

function bar(msg) {
	console.log('bar called '+msg);
	foo("from bar.bar()");
}