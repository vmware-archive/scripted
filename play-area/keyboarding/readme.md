There are quite a few libraries out there doing keybinding stuff. Some that I found:

Potentially Interesting
=======================

Jwerty
------

Link: https://github.com/keithamus/jwerty/

Seems like the most sophisticate library amongst the ones I found. Provides methods to reuse only the
matching logic. 

It supports or-like patterns and sequences.

Supports targeted event listeners (i.e. trapping events on specific dom elements).

Mousetrap 
----------

Link: http://craig.is/killing/mice

 

 - http://www.openjs.com/scripts/events/keyboard_shortcuts/
 - git://github.com/RobertWHurst/KeyboardJS.git
 - https://github.com/madrobby/keymaster
 - https://github.com/jeresig/jquery.hotkeys
 
Ruled out as not interesting:
 - https://github.com/Mytho/KeyHandler.js (looks small, immature, incomplete at first glance)

Some criteria to evaluate these libraries, should we decide to go for a library:
 - Documentation quality
 - Supports sequences?
 - Supports alternatives (i.e. 'or' kind of patterns)
 - Can produce a key binding string/spec from an event?
 - Looks extensible re-useable?
 - Can attach to specific target elements?
 - Other intangibles.

Actaully, probably we don't want to go for any of these libraries because we are somewhat
bound by orion editor in how it handles / registers keybindings.

The libraries above may be useful as a 'source of inspiration' as to
  - good key shortcut syntaxes.
  - ways to parse and match them.
  
But it seems we probably will not be able to use their actual code.

Key events in browser seems like a very messy thing. A lot of details here:
http://unixpapa.com/js/key.html