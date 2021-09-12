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
* unsubscribe and delete) in non sharded setup in a case of
* missing Redis connection.
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

process.env.REDIS_NODES = process.env.REDIS_DOWN_NODES || '127.0.0.1:3333'

const groupPrefix = process.env.GROUP_PREFIX || 'GROUP'
const numberOfGroups = 1
const numberOfMessagesToProducePerGroup = 1
const numberOfConsumersPerGroup = 1

tap.comment('Validates all methods in non sharded setup (no redis connection)')
tap.comment('Dummy Redis node : ' + process.env.REDIS_NODES)
tap.comment('Group prefix : ' + groupPrefix)
tap.comment('Number of groups : ' + numberOfGroups)
tap.comment(
  'Number of messages per group : ' + numberOfMessagesToProducePerGroup)
tap.comment('Number of consumers per group : ' + numberOfConsumersPerGroup)

// ----------------------------------------------------------------------------|
async function consume (tunnel) {
  for await (const messages of tap.context.channel.consume(tunnel)) {
    console.log(messages)
  }
}

// ----------------------------------------------------------------------------|
async function main () {
  try {
    tap.teardown(() => {
      process.exit(0)
    })

    tap.plan(7)

    const channelsOptions = { application: 'test', version: 1 }
    const redisOptions = getRedisOptions()

    tap.context.channels = new RedisChannels({
      channels: channelsOptions,
      redis: redisOptions
    })

    // Create a tunnel
    const tunnel = await tap.context.channels.use(groupPrefix + '-0')
    tap.pass('Created tunnel for a group : ' + groupPrefix + '-0')

    // Try to unsubscribe before subscribe
    await tap.rejects(tap.context.channels.unsubscribe(tunnel), {},
      'Can not unsubscribe before a tunnel subscribe call')

    // Subscribe consumers
    await tap.context.channels.subscribe(tunnel)
    tap.pass('Tried to subscribe for a group : ' + groupPrefix + '-0')

    // Start a consumer
    await tap.rejects(consume(tunnel), {},
      'Can not consume for a consumer : ' + tunnel.consumer)

    // Produce a message
    await tap.rejects(tap.context.channels.produce(tunnel, 'message'), {},
      'Can not produce message to stream : ' + tunnel.key)

    // Unsubscribe a consumer
    tunnel.team = 'MYTEAM'
    /*
    try {
      await tap.context.channels.unsubscribe(tunnel)
    } catch (error) {
      console.log(error)
    }
    */
    await tap.rejects(tap.context.channels.unsubscribe(tunnel), {},
      'Can not unsubscribe consumer : ' + tunnel.consumer)

    // Delete a group
    await tap.rejects(tap.context.channels.delete(groupPrefix + '-0'), {},
      'Can not delete group : ' + groupPrefix + '-0')
  } catch (error) {
    console.log(error)
  }
}
main()
