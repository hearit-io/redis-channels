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
* Validate an unsubscribe in a consumer's team work.
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
const { redis, flushdb, getRedisOptions, sleep } = require('./util')

const groupPrefix = process.env.GROUP_PREFIX || 'GROUP'

tap.comment('Validates an unsubscribe in a consumer\'s team work')
tap.comment('Group prefix : ' + groupPrefix)

// ----------------------------------------------------------------------------|
async function consume (channels, tunnel, tap, ms = 0) {
  try {
    let k = 0
    for await (const messages of channels.consume(tunnel, 'all', 100, 10000)) {
      for (const i in messages) {
        tap.pass('Message consumed ' + '(' + tunnel.consumer + ') : ' + messages[i].data)
        k = k + 1
      }
      await sleep(ms)
    }
    return k
  } catch (error) {
    console.log(error)
  }
}

// ----------------------------------------------------------------------------|

// ----------------------------------------------------------------------------|
async function main () {
  try {
    tap.teardown(async () => {
      const client = redis()
      await flushdb(client)
      await client.quit()
      process.exit(0)
    })

    tap.plan(11)

    const channelsOptions = { application: 'test', version: 1 }
    const redisOptions = getRedisOptions()

    const channels = new RedisChannels({
      channels: channelsOptions,
      redis: redisOptions
    })

    // Create tunnels
    const tunnelOne = await channels.use(groupPrefix)
    await channels.subscribe(tunnelOne, 'team', 'one')
    tap.pass('Subscribed a consumer one')

    const tunnelTwo = await channels.use(groupPrefix)
    await channels.subscribe(tunnelTwo, 'team', 'two')
    tap.pass('Subscribed a consumer two')

    const tunnelThree = await channels.use(groupPrefix)
    await channels.subscribe(tunnelThree, 'another', 'three')
    tap.pass('Subscribed a consumer three (another team)')

    // Start consumers, with a delays between the iterations.
    const promiseOne = consume(channels, tunnelOne, tap, 1000)
    const promiseTwo = consume(channels, tunnelTwo, tap, 600)

    await channels.produce(tunnelOne, 0)

    // Ensure one of the consumers will get two unsubscribe context messages.
    await sleep(500)
    await channels.produce(tunnelTwo, 1)

    await channels.unsubscribe(tunnelOne)
    tap.pass('Unsubscribe a consumer one')
    await channels.unsubscribe(tunnelOne)
    tap.pass('Unsubscribe a consumer one (again)')
    await channels.unsubscribe(tunnelTwo)
    tap.pass('Unsubscribe a consumer two')

    // ----------------------------------------------------------------------------|
    await tap.test('Check total consumed messages', async t => {
      const values = await Promise.all([promiseOne, promiseTwo])
      let count = 0
      for (const i in values) {
        count += values[i]
      }
      await t.same(count, 2, 'All messages has been consumed')
    })

    await channels.cleanup()
    await tap.pass('All channels cleaned up.')

    const client = redis()
    const consumers = await client.xinfo(['GROUPS', tunnelOne.key])
    tap.equal(consumers.length, 0, 'No consumers for stream ' + tunnelOne.key)
    await client.quit()
  } catch (error) {
    console.log(error)
  }
}
main()
