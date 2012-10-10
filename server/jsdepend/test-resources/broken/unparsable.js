/*
    indent_size (default 4)          ? indentation size,
    indent_char (default space)      ? character to indent with,
    preserve_newlines (default true) ? whether existing line breaks should be preserved,
    preserve_max_newlines (default unlimited) - maximum number of line breaks to be preserved in one chunk,
    indent_level (default 0)         ? initial indentation level, you probably won't need this ever,

    space_after_anon_function (default false) ? if true, then space is added between "function ()"
            (jslint is happy about this); if false, then the common "function()" output is used.
    braces_on_own_line (default false) - ANSI / Allman brace style, each opening/closing brace gets its own line.

    js_beautify(js_source_text, {indent_size: 1, indent_char: '\t'});
*/
{
	"formatter": {
		"js": {
			"indent_size": 4,
			"indent_char": "\t"
		}
	}
}