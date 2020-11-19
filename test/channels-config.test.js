// ============================================================================|
/*
* Project : HEARIT
*
* Developing an innovative connected/smart home intelligent
* management system for the needs of blind or visually impaired
* persons.
*
* The project has received funding from the European Regional
* Development Fund through the Operational Program
* "Innovation and Competitiveness"
*
* Purpose:
*
* Configuration options validation tests.
*
* Author: hearit.io
*
* License:
*
* MIT License
*
*/
// ============================================================================|
'use strict'

const tap = require('tap')
const { RedisChannels } = require('../')
const {
  sep, defaultAppName, defaultVersion, defaultSlotsNumb, defaultSchema
} = require('../constants.js')

tap.comment('Configuration options validation tests')
// ----------------------------------------------------------------------------|
async function main () {
  try {
    tap.teardown(() => {
      process.exit(0)
    })

    tap.context.channels = new RedisChannels()

    tap.equal(tap.context.channels._slots, defaultSlotsNumb,
      'Uses default number of slots : ' + defaultSlotsNumb)

    tap.equal(tap.context.channels._sharded, false,
      'Uses default sharded : ' + false)

    const defaultPrefix = defaultAppName + sep.BIND + defaultSchema +
      sep.BIND + defaultVersion

    tap.equal(tap.context.channels._prefix, defaultPrefix,
      'Uses default redis  prefix : ' + defaultPrefix)

    tap.context.channels = new RedisChannels({
      channels: { slots: 64 }
    })
    tap.equal(tap.context.channels._slots, 64,
      'Uses number of slots : ' + 64)

    tap.context.channels = new RedisChannels({
      channels: { overflow: 25 }
    })
    tap.equal(tap.context.channels._overflow, 25,
      'Uses chanell oveflow : ' + 25)

    tap.context.channels = new RedisChannels({
      channels: { log: 'LOG' }
    })
    tap.equal(tap.context.channels._log, 'LOG',
      'Assigned log instance wtith the options')

    tap.context.channels = new RedisChannels({
      channels: { application: 'test', version: 2, schema: 'myschema' }
    })
    const customPrefix = 'test' + sep.BIND + 'myschema' + sep.BIND + 2
    tap.equal(tap.context.channels._prefix, customPrefix,
      'Uses custom redis  prefix : ' + customPrefix)

    tap.context.channels = new RedisChannels({
      redis: { url: 'redis://127.0.0.1:6379' }
    })
    tap.pass('Redis options with URL')

    tap.context.channels = new RedisChannels({
      redis: {
        nodes: [
          { host: '127.0.0.1', port: 6380 },
          { host: '127.0.0.1', port: 6381 },
          { host: '127.0.0.1', port: 6382 }
        ]
      }
    })
    tap.pass('Redis Channels with a Cluster')

    tap.throws(() => {
      const channels = new RedisChannels({ channels: { slots: 16 } })
      console.log(channels)
    }, {}, 'Invalid slots number : ' + 16)
  } catch (error) {
    console.log(error)
  }
}
main()
