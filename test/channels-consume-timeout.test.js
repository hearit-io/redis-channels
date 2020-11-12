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
* Validates consumer behaviour after blocking timeout expire.
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
const { redis, flushdb, sleep, getRedisOptions } = require('./util')
const { blockStreamConsumerTimeOutMs } = require('../constants.js')

const groupPrefix = process.env.GROUP_PREFIX || 'GROUP'
const numberOfGroups = process.env.NUMBER_OF_GROUPS || 1
const numberOfMessagesToProducePerGroup =
  process.env.NUMBER_OF_MESSAGES || 1
const numberOfConsumersPerGroup = process.env.NUMBER_OF_CONSUMERS || 1

tap.comment('Validates consumer behavior after blocking timeout expire')
tap.comment('Group prefix : ' + groupPrefix)
tap.comment('Number of groups : ' + numberOfGroups)
tap.comment('Number of messages per group : ' +
  numberOfMessagesToProducePerGroup)
tap.comment('Number of consumers per group : ' + numberOfConsumersPerGroup)

// ----------------------------------------------------------------------------|
async function main () {
  try {
    await tap.teardown(async () => {
      const client = redis()
      await flushdb(client)
      await client.quit()
      process.exit(0)
    })

    await tap.test('Consume timeout test', async t => {
      const channelsOptions = { application: 'test', version: 1 }
      const redisOptions = getRedisOptions()

      const channels = new RedisChannels({
        channels: channelsOptions,
        redis: redisOptions
      })

      const tunnel = await channels.use(groupPrefix + '-0')
      await t.pass('Created consumer: ' + tunnel.consumer +
            ' for group : ' + groupPrefix + '-0')

      await channels.subscribe(tunnel)
      await t.pass('Subscribed consumer : ' + tunnel.consumer)

      // Start consumer
      async function consume (channels,
        tunnel, numberOfMessagesToProducePerGroup) {
        let k = 0
        for await (const messages of channels.consume(tunnel)) {
          for (const i in messages) {
            if (messages[i].data !== k.toString()) {
              await t.fail('Consumer : ' + tunnel.consumer +
                ' expected : ' + k + ', got ' + messages[i].data + ' message')
            }
            k = k + 1
            if (k === numberOfMessagesToProducePerGroup) {
              await t.pass('Consumer : ' + tunnel.consumer + ' all ' + k +
                ' messages recieved')
            }
          }
        }
      }

      const promise = consume(channels,
        tunnel, numberOfMessagesToProducePerGroup)

      await channels.produce(tunnel, 0)
      t.pass('Produced message 0')

      // Unsubscribe consumers
      await sleep(blockStreamConsumerTimeOutMs + 1000).then(async (resolve) => {
        await channels.unsubscribe(tunnel)
        const timeoutms = blockStreamConsumerTimeOutMs + 1000
        await t.pass('Unsubscribed after miliseconds : ' + timeoutms)
      })
      t.resolves(promise, 'Consumer done')
    })
  } catch (error) {
    console.log(error)
  }
}
main()
