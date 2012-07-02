/**
 * DC-transit
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 */

/*global $:false ui:false transit:false */


transit.util = {

    currentTime:function () {
        'use strict';
        var now = new Date();
        return now.getHours() + ':' + now.getMinutes();
    }

};

transit.util.string = {

    strRepeat:function (str, qty) {
        'use strict';
        if (qty < 1) {
            return '';
        }
        var result = '';
        while (qty > 0) {
            if (qty & 1) {
                result += str;
            }
            qty >>= 1, str += str;
        }
        return result;
    },

    pad:function (str, length, padStr, type) {
        'use strict';
        str += '';

        var padlen = 0;

        length = ~~length;

        if (!padStr) {
            padStr = ' ';
        } else if (padStr.length > 1) {
            padStr = padStr.charAt(0);
        }

        switch (type) {
            case 'right':
                padlen = (length - str.length);
                return str + this.strRepeat(padStr, padlen);
            case 'both':
                padlen = (length - str.length);
                return this.strRepeat(padStr, Math.ceil(padlen / 2)) +
                    str +
                    this.strRepeat(padStr, Math.floor(padlen / 2));
            default: // 'left'
                padlen = (length - str.length);
                return this.strRepeat(padStr, padlen) + str;
        }
    },

    lpad:function (str, length, padStr) {
        'use strict';
        return this.pad(str, length, padStr);
    },

    rpad:function (str, length, padStr) {
        'use strict';
        return this.pad(str, length, padStr, 'right');
    },

    lrpad:function (str, length, padStr) {
        'use strict';
        return this.pad(str, length, padStr, 'both');
    }

};
