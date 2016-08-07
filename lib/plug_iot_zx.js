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
 *  Provides access to ZX infrared sensor.
 *
 * @name caf_rpi_zx/plug_iot_zx
 * @namespace
 * @augments caf_components/gen_plug
 *
 */
var assert = require('assert');
var i2c = require('i2c-bus');
var caf_iot = require('caf_iot');
var caf_comp = caf_iot.caf_components;
var myUtils = caf_comp.myUtils;
var genPlugIoT = caf_iot.gen_plug_iot;
var fs = require('fs');
var domain = require('domain');
var zx_util = require('./zx_util');
var mock_zx = require('./mock_zx');

var ZX_CRON = 'zxCron';

/**
 * Factory method for a plug that access a ZX infrared sensor.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var cbOnce = myUtils.callJustOnce(function(err) {
            if (err) {
                $._.$.log &&
                    $._.$.log.debug('Ignoring >1 callback with error:' +
                                    myUtils.errToPrettyStr(err));
            }
        }, cb);

        var disableWithError = null;
        var that = genPlugIoT.constructor($, spec);

        $._.$.log && $._.$.log.debug('New ZX plug');

        assert.equal(typeof spec.env.deviceAddress, 'string',
                     "'spec.env.deviceAddress' not a string");
        var deviceAddress = parseInt(spec.env.deviceAddress);

        var zx = null;

        assert.equal(typeof spec.env.deviceZX, 'string',
                     "'spec.env.deviceZX' not a string");
        var devNum = parseInt(spec.env.deviceZX.split('-')[1]);
        assert(!isNaN(devNum), 'Invalid device ' + spec.env.deviceZX);

        assert.equal(typeof spec.env.allowMock, 'boolean',
                     "'spec.env.allowMock' not a boolean");

        assert.equal(typeof spec.env.deviceSamplingInterval, 'number',
                     "'spec.env.deviceSamplingInterval' not a number");

        var counter = 0;

        var data = [];

        var newDataPointF = function(cb0) {
            var readF = (disableWithError ? mock_zx.readData :
                         zx_util.readData);
            readF(zx, deviceAddress, function(err, x) {
                if (err) {
                    cb0(err);
                } else {
                    if (x) {
                        data.push(x);
                        counter = counter + 1;

                        if (data.length > zx_util.NUM_SAMPLES) {
                            data.shift();
                        }

                        if (data.length === zx_util.NUM_SAMPLES) {
                            var dp = zx_util.computeSample(data, counter);
                            cb0(null, [dp]);
                        } else {
                            // partial window
                            cb0(null, null);
                        }
                    } else {
                        // data not available yet
                        cb0(null, null);
                    }
                }
            });
        };

        that.__iot_registerHandler__ = function(method) {
            $._.$.cron.__iot_addCron__(ZX_CRON, method, newDataPointF,
                                       spec.env.deviceSamplingInterval);
        };

        that.__iot_clearHandler__ = function() {
            $._.$.cron.__iot_deleteCron__(ZX_CRON);
        };

        var d = domain.create();

        var errorCB = function(err) {
            if (err) {
                disableWithError = err;
                $._.$.log &&
                    $._.$.log.warn('Disabling plug_zx due to error: ' +
                                   myUtils.errToPrettyStr(err));
            }
            if (err && !spec.env.allowMock) {
                $._.$.log && $._.$.log.warn('Mock disable, fail');
                cbOnce(err);
            } else {
                if (err) {
                    $._.$.log && $._.$.log.warn('Mock enable, continue');
                }
                cbOnce(null, that); // continue but just mock
            }
        };

        d.on('error', errorCB);

        d.run(function() {
            var info = fs.statSync(spec.env.deviceZX); // throws if no device
            $._.$.log && $._.$.log.debug(info);
            zx = i2c.openSync(devNum);

            // throw away, just to test it works
            zx_util.readData(zx, deviceAddress, errorCB);
        });
    } catch (err) {
        cbOnce(err);
    }
};
