/*******************************************************************************
 * @license
 * Copyright (c) 2013 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Kris De Volder (VMWare) - initial API and implementation
 ******************************************************************************/

define(function(require) {

    /**
     * Follow a 'trail' of properties starting at given object.
     * If one of the values on the trail is 'falsy' then
     * this value is returned instead of trying to keep following the
     * trail down.
     */
    function deref(obj, props) {
        //TODO func copied from jsdepend.utils
        var it = obj;
        for (var i = 0; it && i < props.length; i++) {
            it = it[props[i]];
        }
        return it;
    }

	return deref;
});