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
* Team work - every consumer processes different part of the messages.
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
const { redis, flushdb, getRedisOptions } = require('./util')

const groupPrefix = process.env.GROUP_PREFIX || 'GROUP'

const numberOfMessagesToProduce = 10

const numberOfConsumers = 4

tap.comment('Validates consumer\'s team work')
tap.comment('Group prefix : ' + groupPrefix)
tap.comment('Number of messages  : ' + numberOfMessagesToProduce)
tap.comment('Number of consumers : ' + numberOfConsumers)

// ----------------------------------------------------------------------------|
async function consume (channels, tunnel, tap) {
  try {
    let k = 0
    for await (const messages of channels.consume(tunnel, 'all', 100, 10000)) {
      for (const i in messages) {
        tap.pass('Message consumed ' + '(' + tunnel.consumer + ') : ' + messages[i].data)
        k = k + 1
      }
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

    tap.plan(17)

    const channelsOptions = { application: 'test', version: 1 }
    const redisOptions = getRedisOptions()

    const channels = new RedisChannels({
      channels: channelsOptions,
      redis: redisOptions
    })

    // Create tunnels
    const tunnels = []
    for (let i = 0; i < numberOfConsumers; i++) {
      tunnels.push(await channels.use(groupPrefix))
    }

    // Subscribe consumers
    await tap.test('Subscribe consumers (not generated)', async t => {
      for (const i in tunnels) {
        await channels.subscribe(tunnels[i], 'team', 'consumer-' + i)
        t.pass('Subscribed a consumer in \'team\' : ' + tunnels[i].consumer)
        await channels.subscribe(tunnels[i], 'team', 'consumer-' + i)
        t.pass('Subscribed twice a consumer in \'team\' : ' + tunnels[i].consumer)
      }
    })

    // Start consumers
    const promises = []
    for (const i in tunnels) {
      promises.push(consume(channels, tunnels[i], tap))
    }

    // Produce messages
    await tap.test('Produce', async t => {
      for (let i = 0; i < numberOfMessagesToProduce; i++) {
        await channels.produce(tunnels[0], i)
        await t.pass('Message produced : ' + i)
      }
    })

    // Unsubscribe consumers
    await tap.test('Unsubscribe', async t => {
      for (const i in tunnels) {
        await channels.unsubscribe(tunnels[i])
        await t.pass('Consumer unsubscribed :' + tunnels[i].consumer)
      }
    })

    // ----------------------------------------------------------------------------|
    await tap.test('Check total consumed messages', async t => {
      const values = await Promise.all(promises)
      let count = 0
      for (const i in values) {
        count += values[i]
      }
      await t.same(count,
        numberOfMessagesToProduce, 'All messages has been consumed')
    })

    let client = redis()
    let info = await client.xinfo(['GROUPS', tunnels[0].key])
    tap.equal(info[0][3], 4,
      'There should be 4 consumers left for a stream ' + tunnels[0].key)
    await client.quit()

    await channels.cleanup()

    client = redis()
    info = await client.xinfo(['GROUPS', tunnels[0].key])
    tap.equal(info.length, 0,
      'There should be 0 consumers left for a stream ' + tunnels[0].key)
    await client.quit()

    await tap.pass('All channels cleaned up.')
  } catch (error) {
    console.log(error)
  }
}
main()
