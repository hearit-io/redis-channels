// ============================================================================|
/*
* Project : HEARIT
*
* Developing an innovative connected/smart home intelligent
* management system for the needs of blind or visually impaired
* persons.
*
* Purpose:
*
* Validates a consumer call with offline Redis db.
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
const { getRedisOptions } = require('./util')

const groupPrefix = process.env.GROUP_PREFIX || 'GROUP'

tap.comment('A consumer call with offline Redis db')
tap.comment('Group prefix : ' + groupPrefix)

process.env.REDIS_NODES = process.env.REDIS_DOWN_NODES || '127.0.0.1:3333'

// ----------------------------------------------------------------------------|
async function consume (channels, tunnel) {
  let k = 0
  for await (const messages of channels.consume(tunnel)) {
    console.log(messages)
    k = k + 1
  }
  return k
}

// ----------------------------------------------------------------------------|

// ----------------------------------------------------------------------------|
async function main () {
  try {
    tap.teardown(async () => {
      process.exit(0)
    })

    tap.plan(1)

    const channelsOptions = { application: 'test', version: 1 }
    const redisOptions = getRedisOptions()

    const channels = new RedisChannels({
      channels: channelsOptions,
      redis: redisOptions
    })

    const tunnel = await channels.use(groupPrefix)
    await channels.subscribe(tunnel)
    await tap.rejects(consume(channels, tunnel), {}, 'No connection')
  } catch (error) {
    console.log(error)
  }
}
main()
