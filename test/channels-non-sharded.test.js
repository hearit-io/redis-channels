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
* Validates all steps (use, subscribe, consume, produce,
* unsubscribe and delete) in non sharded setup.
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
const numberOfGroups = 2
const numberOfMessagesToProducePerGroup = 10
const numberOfConsumersPerGroup = 2

tap.comment('Validates all methods in a non sharded setup')
tap.comment('Group prefix : ' + groupPrefix)
tap.comment('Number of groups : ' + numberOfGroups)
tap.comment(
  'Number of messages per group : ' + numberOfMessagesToProducePerGroup)
tap.comment('Number of consumers per group : ' + numberOfConsumersPerGroup)

// ----------------------------------------------------------------------------|
async function consume (count, numberOfMessagesToProducePerGroup) {
  let k = 0
  for await (const messages of
    tap.context.channels.consume(tap.context.tunnels[count])) {
    for (const i in messages) {
      if (messages[i].data !== k.toString()) {
        await tap.fail('Consumer : ' +
          tap.context.tunnels[count].consumer + ' expected : ' + k +
          ', got ' + messages[i].data + ' message')
      }
      k = k + 1
      if (k === numberOfMessagesToProducePerGroup) {
        await tap.pass('Consumer : ' +
          tap.context.tunnels[count].consumer + ' all ' + k +
          ' messages recieved')
      }
    }
  }
  tap.pass('Consumer done : ' + tap.context.tunnels[count].consumer)
}

// ----------------------------------------------------------------------------|
async function main () {
  try {
    tap.teardown(async () => {
      const client = redis()
      await flushdb(client)
      await client.quit()
      process.exit(0)
    })

    tap.plan(16)

    const channelsOptions = { application: 'test', version: 1 }
    const redisOptions = getRedisOptions()

    tap.context.channels = new RedisChannels({
      channels: channelsOptions,
      redis: redisOptions
    })

    tap.context.tunnels = []
    tap.context.groups = []

    // Create tunnels
    await tap.test('Create tunnels', async t => {
      for (let g = 0; g < numberOfGroups; g++) {
        for (let i = 0; i < numberOfConsumersPerGroup; i++) {
          const tunnel = await t.context.channels.use(groupPrefix + '-' + g)
          t.pass('Created tunnel for group : ' + groupPrefix + '-' + g)
          t.context.tunnels.push(tunnel)
          if (i === 0) {
            t.context.groups.push(tunnel)
          }
        }
      }
    })

    // Subscribe consumers
    await tap.test('Subscribe consumers', async t => {
      for (const i in t.context.tunnels) {
        await t.context.channels.subscribe(t.context.tunnels[i])
        t.pass('Subscribed consumer : ' + t.context.tunnels[i].consumer)
      }
    })

    // Start consumers
    const promises = []
    for (const i in tap.context.tunnels) {
      promises.push(consume(i, numberOfMessagesToProducePerGroup))
    }

    await sleep(1000)

    // Produce messages
    await tap.test('Produce', async t => {
      for (let i = 0; i < numberOfMessagesToProducePerGroup; i++) {
        let isProduced = false
        for (const g in t.context.groups) {
          await t.context.channels.produce(t.context.groups[g], i)
          await t.context.channels.produce(t.context.groups[g], i, 'mytype')
          await t.pass('Message : ' + i + ' with a specific type.')
          isProduced = true
        }
        if (isProduced) {
          await t.pass('Message : ' + i + ' to all streams.')
        }
      }
    })

    // Unsubscribe consumers
    await tap.test('Unsubscribe', async t => {
      for (const i in t.context.tunnels) {
        await t.context.channels.unsubscribe(t.context.tunnels[i])
        await t.pass('Consumer :' + tap.context.tunnels[i].consumer)
      }
    })

    // Delete group related data.
    await tap.test('Test for outstanding consumers', async t => {
      const client = redis()
      await t.resolves(Promise.all(promises), 'All consumers done')
      for (const g in t.context.groups) {
        const consumers = await client.xinfo(
          ['GROUPS', t.context.groups[g].key])
        t.equal(consumers.length, 0,
          'No consumers for stream ' + t.context.groups[g].key)
        await t.context.channels.delete(groupPrefix + '-' + g)
        tap.pass('Deleted group : ' + groupPrefix + '-' + g)
      }
      await client.quit()
    })
    await tap.context.channels.cleanup()
    await tap.pass('All channels cleaned up.')
  } catch (error) {
    console.log(error)
  }
}
main()
