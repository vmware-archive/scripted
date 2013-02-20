Notes:

jquery-ui isn't well behaved and you may see 'jQuery is not defined' when trying to use it with AMD.

I followed the quick hack on:
http://weblog.latte.ca/blake/employment/mozilla/jqueryui.html
and added the surrounding define to the custom one we use. (see the new first and last lines)
