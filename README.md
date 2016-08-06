# CAF (Cloud Assistant Framework)

Co-design permanent, active, stateful, reliable cloud proxies with your web app or gadget.

See http://www.cafjs.com

## CAF RPI ZX

This library access a ZX infrared sensor using a RPi.

It runs in the device not in the cloud.

## API

    lib/proxy_iot_zx.js

## Configuration Example

### iot.json

    {
            "module": "caf_rpi_zx#plug_iot",
            "name": "zx",
            "description": "Access ZX infrared sensor for this device.",
            "env" : {
                "maxRetries" : "$._.env.maxRetries",
                "retryDelay" : "$._.env.retryDelay",
                "deviceZX" : "process.env.DEVICE_ZX||/dev/i2c-1",
                "deviceAddress" : "process.env.DEVICE_ADDRESS||0x10",
                "allowMock" : "process.env.ALLOW_MOCK||true",
                "deviceSamplingInterval": "process.env.DEVICE_SAMPLING_INTERVAL||20"
            },
            "components" : [
                {
                    "module": "caf_rpi_zx#proxy_iot",
                    "name": "proxy",
                    "description": "Proxy to shutdown/delayed restart service",
                    "env" : {
                    }
                }
            ]
    }

where `deviceZX` and `deviceAddress` are associated with the i2c interface that the ZX sensor exposes.
