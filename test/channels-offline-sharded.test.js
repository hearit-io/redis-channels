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
* unsubscribe and delete) in non sharded setup on missing Redis connection.
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

tap.comment('Validates all methods in sharded setup (no redis connection)')
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

    const channelsOptions = { application: 'test', version: 1, sharded: true }
    const redisOptions = getRedisOptions()

    const channels = new RedisChannels({
      channels: channelsOptions,
      redis: redisOptions
    })

    // Create a tunnel
    await tap.rejects(channels.use(groupPrefix + '-0'), {},
      'Can not create a tunnel for a group : ' + groupPrefix + '-0')

    const tunnel = undefined
    // Subscribe consumers
    await tap.rejects(channels.subscribe(tunnel), {},
      'Can not subscribe with unedined tunnel for a group : ' + groupPrefix + '-0')

    // Start a consumer
    await tap.rejects(consume(tunnel), {},
      'Can not consume from a group : ' + groupPrefix + '-0')

    // Produce a message
    await tap.rejects(channels.produce(tunnel, 'message'), {},
      'Can not produce message to stream for a group: ' + groupPrefix + '-0')

    // Unsubscribe a consumer
    await tap.rejects(channels.unsubscribe(tunnel), {},
      'Can not unsubscribe consumer for a group : ' + groupPrefix + '-0')

    // Delete a group
    await tap.rejects(channels.delete(groupPrefix + '-0'), {},
      'Can not delete group : ' + groupPrefix + '-0')

    // Initialize a shard score
    await tap.rejects(channels._initShardScores(), {},
      'Can not initialize the shard score')
  } catch (error) {
    console.log(error)
  }
}
main()
