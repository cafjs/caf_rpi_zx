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
const assert = require('assert');
const i2c = require('i2c-bus');
const caf_iot = require('caf_iot');
const caf_comp = caf_iot.caf_components;
const myUtils = caf_comp.myUtils;
const genPlugIoT = caf_iot.gen_plug_iot;
const fs = require('fs');
const domain = require('domain');
const zx_util = require('./zx_util');
const mock_zx = require('./mock_zx');

const ZX_CRON = 'zxCron';

/**
 * Factory method for a plug that access a ZX infrared sensor.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    const cbOnce = myUtils.callJustOnce(function(err) {
        if (err) {
            $._.$.log &&
                $._.$.log.debug('Ignoring >1 callback with error:' +
                                myUtils.errToPrettyStr(err));
        }
    }, cb);

    try {
        var disableWithError = null;
        const that = genPlugIoT.create($, spec);

        $._.$.log && $._.$.log.debug('New ZX plug');

        assert.equal(typeof spec.env.deviceAddress, 'string',
                     "'spec.env.deviceAddress' not a string");
        const deviceAddress = parseInt(spec.env.deviceAddress);

        var zx = null;

        assert.equal(typeof spec.env.deviceZX, 'string',
                     "'spec.env.deviceZX' not a string");
        const devNum = parseInt(spec.env.deviceZX.split('-')[1]);
        assert(!isNaN(devNum), 'Invalid device ' + spec.env.deviceZX);

        assert.equal(typeof spec.env.allowMock, 'boolean',
                     "'spec.env.allowMock' not a boolean");

        assert.equal(typeof spec.env.deviceSamplingInterval, 'number',
                     "'spec.env.deviceSamplingInterval' not a number");

        var counter = 0;

        const data = [];

        const newDataPointF = function(cb0) {
            const readF = disableWithError ?
                mock_zx.readData :
                zx_util.readData;
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
                            const dp = zx_util.computeSample(data, counter);
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
                                       spec.env.deviceSamplingInterval,
                                       {noSync: true});
        };

        that.__iot_clearHandler__ = function() {
            $._.$.cron.__iot_deleteCron__(ZX_CRON);
        };

        const d = domain.create();

        const errorCB = function(err) {
            if (err) {
                disableWithError = err;
                $._.$.log &&
                    $._.$.log.warn('Disabling plug_zx due to error: ' +
                                   myUtils.errToPrettyStr(err));
            }
            if (err && !spec.env.allowMock) {
                $._.$.log && $._.$.log.warn('Mock disabled, fail');
                cbOnce(err);
            } else {
                if (err) {
                    $._.$.log && $._.$.log.warn('Mock enabled, continue');
                }
                cbOnce(null, that); // continue but just mock
            }
        };

        d.on('error', errorCB);

        d.run(function() {
            const info = fs.statSync(spec.env.deviceZX); // throws if no device
            $._.$.log && $._.$.log.debug(info);
            zx = i2c.openSync(devNum);

            // throw away, just to test it works
            zx_util.readData(zx, deviceAddress, errorCB);
        });
    } catch (err) {
        cbOnce(err);
    }
};
