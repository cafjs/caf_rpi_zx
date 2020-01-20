/*!
Copyright 2013 Hewlett-Packard Development Company, L.P.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

/**
 * A proxy to access a ZX infrared sensor.
 *
 * @name caf_rpi_zx/proxy_iot_zx
 * @namespace
 * @augments caf_components/gen_proxy
 *
 */
var caf_iot = require('caf_iot');
var caf_comp = caf_iot.caf_components;
var genProxy = caf_comp.gen_proxy;

/**
 * Factory method to access a ZX infrared sensor.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {

    var that = genProxy.create($, spec);

    /**
     * Registers a handler method to be called when new sensor data is
     * available.
     *
     * The type of that method  takes two arguments, i.e., fun(data, cb)
     *
     *  `data` is of the type:
     *
     *      {index: number, z: number, dZ: number, rawZ: number, x: number,
     *       dX: number, rawX: number}
     *
     * where index is just a counter identifying the data point,
     *      `z` is an smoothed value for the Z coordinate (0-255 integer)
     *       'dZ' is a derivative of the Z coordinate (float)
     *       'rawZ' is the original value for Z (0-255 integer)
     *        ditto for X axis
     *
     * and `cb` is just a standard cafjs callback
     *
     *   Smoothing and derivatives use a Savitzky-Golay filter. Actual values
     * are delayed for half the window size to enable filtering.
     *
     * @param {string} method A method called with sensor data or error.
     *
     *
     * @name caf_rpi_zx/proxy_iot_zx#registerHandler
     * @function
     */
    that.registerHandler = function(method) {
        $._.__iot_registerHandler__(method);
    };

    /**
     * Clears a handler method to be called when new sensor data is
     * available.
     *
     *
     * @name caf_rpi_zx/proxy_iot_zx#clearHandler
     * @function
     */
    that.clearHandler = function() {
        $._.__iot_clearHandler__();
    };

    Object.freeze(that);

    cb(null, that);
};
