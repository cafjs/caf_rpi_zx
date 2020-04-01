// Modifications copyright 2020 Caf.js Labs and contributors
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

const caf_iot = require('caf_iot');
const caf_comp = caf_iot.caf_components;
const async = caf_comp.async;

const ZX_STATUS= 0x00;
const ZX_XPOS = 0x08;
const ZX_ZPOS = 0x0A;

const MASK_READY = 0x01;

/**
 * Helper functions to program a ZX infrared sensor
 *
 * @name caf_rpi_zx/zx_util
 * @namespace
 */
const isDataReady = function(status) {
    return status & MASK_READY;
};

const readOneByte = function(zx, deviceAddress, cmd, cb) {
    const N = 1;
    const bytesBuffer = Buffer.alloc(N);
    zx.readI2cBlock(
        deviceAddress, cmd, N, bytesBuffer, function(err, bytesRead, res) {
            if (err) {
                cb(err);
            } else if (bytesRead !== N) {
                const msg = 'Not all bytes read';
                const error = new Error(msg);
                error.bytesRead = bytesRead;
                error.res = res;
                cb(error);
            } else {
                cb(null, res.readUInt8(0));
            }
        }
    );
};


/*
 * Returns in callback null if data not ready, error if it cannot talk with
 * device, or the object {rawX:number, rawZ:number} where numbers are uint8.
 *
 */
exports.readData = function(zx, deviceAddress, cb) {
    async.waterfall([
        function(cb0) {
            readOneByte(zx, deviceAddress, ZX_STATUS, cb0);
        },
        function(status, cb0) {
            if (isDataReady(status)) {
                async.mapSeries([ZX_ZPOS, ZX_XPOS], function(x, cb1) {
                    readOneByte(zx, deviceAddress, x, cb1);
                }, function(err, data) {
                    if (err) {
                        cb0(err);
                    } else {
                        cb0(null, {rawZ: data[0], rawX: data[1]});
                    }
                });
            } else {
                cb0(null, null);
            }
        }
    ], cb);
};


exports.NUM_SAMPLES = 7;
// Savitzky-Golay quadratic
const SG_SMOOTH = [-2, 3, 6, 7, 6, 3, -2];
const SG_SMOOTH_NORM = 21;
const SG_DERIV = [-3, -2, -1, 0, 1, 2, 3];
const SG_DERIV_NORM = 28;
const TARGET_INDEX = 3;
const MAX_VALUE = 240;
const MIN_VALUE = 0;

exports.computeSample = function(data, counter) {
    const filter = function(coeff, norm, index) {
        let res = 0;
        coeff.forEach(function(x, i) {
            res = res + x * data[i][index];
        });
        return res/norm;
    };
    const cap = function(x) {
        x = Math.round(x);
        x = Math.min(x, MAX_VALUE);
        x = Math.max(x, MIN_VALUE);
        return x;
    };
    const result = {};

    result.rawZ = data[TARGET_INDEX].rawZ;
    result.rawX = data[TARGET_INDEX].rawX;
    result.index = counter - TARGET_INDEX;
    result.z = cap(filter(SG_SMOOTH, SG_SMOOTH_NORM, 'rawZ'));
    result.x = cap(filter(SG_SMOOTH, SG_SMOOTH_NORM, 'rawX'));
    result.dZ = filter(SG_DERIV, SG_DERIV_NORM, 'rawZ');
    result.dX = filter(SG_DERIV, SG_DERIV_NORM, 'rawX');

    return result;
};
