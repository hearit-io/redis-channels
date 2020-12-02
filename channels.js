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
* Pre-sharded channels implementation based on Redis streams.
*
* Author: hearit.io
*
* API:
*
* use, susbscribe, unsubscribe, produce, consume, delete and cleanup
*
* License:
*
* MIT License
*
*/
// ============================================================================|
'use strict'

const { v4: uuidv4 } = require('uuid')
const Redis = require('ioredis')

const {
  opt,
  sep,
  pre,
  tun,
  msg,
  origin,
  shards,
  context,
  overflowStreamElemNumber,
  blockStreamConsumerTimeOutMs,
  maxMessageStreamConsumePerRun,
  defaultSchema,
  defaultAppName,
  defaultVersion,
  defaultSlotsNumb,
  defaultOriginType
} = require('./constants.js')

const { RedisChannelsError } = require('./errors.js')

/*
* Usage example:
*
* const {RedisChannels} = require('@hearit-io/redis-channel')
*
* const channels = new RedisChannels()
*
* const tunnel = await channels.use('group')
*
* await channels.subscribe(tunnel)
*
* async function process(tunnel) {
*   for await (const messages of channels.consume(tunnel)) {
*     for (const i in messages) {
*       console.log(messages[i]);
*     }
*   }
* }
*
* process(tunnel).catch((error) => {
*   console.error(error);
* });
*
* await channels.produce(tunnel, 'message')
*
* await channels.unsubscribe(tunnel)
*
* await channels.delete('group')
*
* await channels.cleanup()
*
*
*/
// ----------------------------------------------------------------------------|
class RedisChannels {
  constructor (options = {}) {
    let { channels, redis } = options
    channels = channels || {}

    this._nonBlockRedisClient = this._createRedisClient(redis)

    this._consumers = {}

    if (typeof channels[opt.LOG] === 'undefined') {
      this._log = require('abstract-logging')
    } else {
      this._log = channels[opt.LOG]
    }

    if (typeof channels[opt.OVERFLOW] === 'undefined' ||
      Number.isInteger(channels[opt.OVERFLOW]) === false) {
      this._overflow = overflowStreamElemNumber
    } else {
      this._overflow = channels[opt.OVERFLOW]
    }

    if (typeof channels[opt.SLOTS] === 'undefined') {
      this._slots = defaultSlotsNumb
    } else {
      if (channels[opt.SLOTS] !== 32 &&
                channels[opt.SLOTS] !== 64) {
        throw new RedisChannelsError(
          'Invalid shards: ' + channels[opt.SLOTS] +
                    'allowed values are 32 or 64.')
      }
      this._slots = channels[opt.SLOTS]
    }

    if (typeof channels[opt.SHARDED] === 'undefined') {
      this._sharded = false
    } else {
      this._sharded = channels[opt.SHARDED]
    }

    let schema = defaultSchema
    if (typeof channels[opt.SCHEMA] !== 'undefined') {
      schema = channels[opt.SCHEMA]
    }

    let version = defaultVersion
    if (typeof channels[opt.VESRION] !== 'undefined') {
      version = channels[opt.VESRION]
    }

    let application = defaultAppName
    if (typeof channels[opt.APPLICATION] !== 'undefined') {
      application = channels[opt.APPLICATION]
    }

    this._prefix = application + sep.BIND + schema + sep.BIND + version

    if (this._sharded) {
      this._keyHash = this._prefix + sep.HASH + pre.KEYS +
        shards[this._slots][0] + sep.OPEN + 0 + sep.CLOSE

      this._keyZset = this._prefix + sep.INDEX + pre.SHARDS +
        shards[this._slots][0] + sep.OPEN + 0 + sep.CLOSE
    }
  };

  /*
  * Returns a tunnel object to access the channel for a particular group.
  *
  * It creates all related data in the Redis DB initially if necessary.
  *
  * Parameters:
  *
  * group - a string with the group id
  *
  * Returns a tunnel object with a builded stream 'key'.
  *
  * {key: <prefix>{<hash_slot>}<group>[<shard_id>]}
  *
  * On error throws an exception.
  *
  */
  // --------------------------------------------------------------------------|
  async use (group) {
    try {
      if (this._sharded === false) {
        return {
          [tun.KEY]: this._prefix + sep.STREAM + group
        }
      }

      let keyStream =
        await this._nonBlockRedisClient.hget([this._keyHash, group])

      // We have already the mapping group to sharded stream key.
      if (keyStream !== null) {
        return {
          [tun.KEY]: keyStream
        }
      }

      // We need to check the shards score.
      let shard = await this._nonBlockRedisClient.zrangebyscore(
        [this._keyZset, '-inf', '+inf', 'WITHSCORES', 'LIMIT', '0', '1'])

      // We must initialize the shards.
      if (shard.length === 0) {
        await this._initShardScores()
        shard = await this._nonBlockRedisClient.zrangebyscore(
          [this._keyZset, '-inf', '+inf', 'WITHSCORES', 'LIMIT', '0', '1'])
      }

      const [set] = shard
      keyStream = this._prefix + sep.STREAM + shards[this._slots][set] + group +
        sep.OPEN + set + sep.CLOSE

      await this._nonBlockRedisClient.hset([this._keyHash, group, keyStream])

      await this._nonBlockRedisClient.zincrby([this._keyZset, 1, set])

      return {
        [tun.KEY]: keyStream
      }
    } catch (error) {
      this._log.error('Use error: %o', error)
      throw new RedisChannelsError('Can not call use for a group : ' +
        group + ' with sharded mode = ' + this._sharded, error)
    }
  }

  /*
  * Deletes a group and all related data in a Redis DB.
  *
  * On error throws an exception.
  */
  // --------------------------------------------------------------------------|
  async delete (group) {
    try {
      if (this._sharded === false) {
        await this._nonBlockRedisClient.del([this._prefix + sep.STREAM + group])
        return
      }
      const keyStream =
        await this._nonBlockRedisClient.hget([this._keyHash, group])
      const slot = keyStream.match(/\[([0-9]+)\]$/)[1]
      await this._nonBlockRedisClient.del([keyStream])
      await this._nonBlockRedisClient.hdel([this._keyHash, group])
      await this._nonBlockRedisClient.zincrby([this._keyZset, -1, slot])
    } catch (error) {
      this._log.error('Delete error: %o', error)
      throw new RedisChannelsError('Can not delete  a group : ' +
        group + ' with sharded mode = ' + this._sharded, error)
    }
  }

  /*
  * Subscribes for a tunnel
  *
  * It creates a Redis clinet (for a blocking connection), a consumer,
  * a consumer group and a stream to access the tunnel.
  *
  * Paramters:
  *
  * tunnel - a tunnel object to use.
  *
  * team - a name (string) of the consumer group. If not specified a
  *        consumer name will be used instead.
  *
  * consumer - a unique consumer name (string) within a team . If not specified
  *            a UUID version 4 will be generated.
  *
  * A subscription is necessary only for a consumer not for a producer.
  *
  * On error throws an exception.
  */
  // --------------------------------------------------------------------------|
  async subscribe (tunnel, team, consumer) {
    try {
      if (typeof tunnel === 'undefined' ||
        typeof tunnel[tun.KEY] === 'undefined') {
        throw new RedisChannelsError(
          'Can not subscribe, no valid tunnel object')
      }
      if (typeof consumer === 'undefined') {
        tunnel[tun.CONSUMER] = uuidv4().replace(/-/g, '')
      } else {
        tunnel[tun.CONSUMER] = consumer
      }
      if (typeof team === 'undefined') {
        tunnel[tun.TEAM] = tunnel[tun.CONSUMER]
      } else {
        tunnel[tun.TEAM] = team
      }

      // Tries to create a consumer group and a stream if not exists.
      try {
        await this._nonBlockRedisClient.xgroup([
          'CREATE', tunnel[tun.KEY], tunnel[tun.TEAM], '$', 'MKSTREAM'
        ])
      } catch { }

      // Creates a redis client if necessery.
      if (!(tunnel[tun.CONSUMER] in this._consumers)) {
        tunnel[tun.CONNECTION] = this._duplicateRedisClient()
        this._consumers[tunnel[tun.CONSUMER]] = tunnel
      }
    } catch (error) {
      this._log.error('Subscribe error: %o', error)
      throw error
    }
  }

  /*
  * Unsubscribes a tunnel.
  *
  * On error throws an exception.
  */
  // --------------------------------------------------------------------------|
  async unsubscribe (tunnel) {
    try {
      if (typeof tunnel === 'undefined' ||
        typeof tunnel[tun.TEAM] === 'undefined') {
        throw new RedisChannelsError(
          'Can not unsubscribe, no valid tunnel object')
      }
      const field = {
        [origin.CONTEXT]: context.UNSUBSCRIBE,
        [origin.CONTENT]: tunnel[tun.TEAM]
      }

      await this._nonBlockRedisClient.xadd([
        tunnel[tun.KEY], 'MAXLEN', '~', this._overflow, '*',
        JSON.stringify(field), ''
      ])
    } catch (error) {
      this._log.error('Unsubscribe error: %o', error)
      if (error instanceof RedisChannelsError) {
        throw error
      }
      throw new RedisChannelsError(
        'Can not unsubscribe for consumer : ' + tunnel[tun.CONSUMER],
        error)
    }
  }

  /*
  * Produces a message in a channel with a give type.
  *
  * Parameters:
  *
  * tunnel - a tunnel object (result form use)
  *
  * message - a string, message to produce.
  *
  * type - a string, can be used to distinguish between message sources.
  *        Default value is 'all'.
  *
  * On error throws an error
  */
  // --------------------------------------------------------------------------|
  async produce (tunnel, message, type = defaultOriginType) {
    try {
      const field = {
        [origin.CONTEXT]: context.ORIGIN,
        [origin.CONTENT]: type
      }

      await this._nonBlockRedisClient.xadd([
        tunnel[tun.KEY], 'MAXLEN', '~', this._overflow, '*',
        JSON.stringify(field), message
      ])
    } catch (error) {
      this._log.error('Produce error: %o', error)
      throw new RedisChannelsError(
        'Can not produce in the tunnel: ' + tunnel, error)
    }
  }

  /*
  * Consumes messages for a given type from a tun.
  *
  * It is an asynchronous iterator, returns an array of messages.
  * Every message is an object {id: <string>, data: <string>}.
  *
  * Parameters:
  *
  * tunnel - a tunnel object (result form use)
  *
  * type - a string, can be used to distinguish between message sources.
  *        Default value is 'all'.
  *
  * count  - a maximum number of messages consumed per iteration.
  *          Default value is 100.
  *
  * timeout  - a blocking timeout in milliseconds. Default value is 10000.
  *
  * On error throws an exeption
  *
  * TODO!!!
  *
  * If a consumers are working in a team it is possible that one consumer
  * gets two 'unsubscrbe' messages. After the processing of the fisrt it will
  * just finish. In this case some other consumer in a team will not be
  * recieve his 'unsubscribe' message.
  *
  * In this case a consumer should produce back all 'unsubscribe' messages,
  * which should be recieved by all outher consumers within the same team.
  */
  // --------------------------------------------------------------------------|
  async * consume (tunnel, type = defaultOriginType,
    count = maxMessageStreamConsumePerRun,
    timeout = blockStreamConsumerTimeOutMs) {
    try {
      let unsubscribe = false
      while (true) {
        const result = []
        const data = await
        this._consumers[tunnel[tun.CONSUMER]][tun.CONNECTION].xreadgroup([
          'GROUP', tunnel[tun.TEAM], tunnel[tun.CONSUMER],
          'COUNT', count,
          'BLOCK', timeout,
          'NOACK', 'STREAMS', tunnel[tun.KEY], '>'
        ])
        if (data === null) {
          continue
        }
        for (const stream of data) {
          for (const event of stream[1]) {
            const id = event[0]
            const messages = event[1]
            for (let i = 0; i < messages.length; i += 2) {
              const field = JSON.parse(messages[i])
              const message = messages[i + 1]
              if (field[origin.CONTEXT] === context.ORIGIN &&
                field[origin.CONTENT] === type) {
                result.push({ [msg.ID]: id, [msg.DATA]: message })
              } else if (field[origin.CONTEXT] === context.UNSUBSCRIBE &&
                field[origin.CONTENT] === tunnel[tun.TEAM]) {
                if (unsubscribe === false) {
                  // Cleanup a redis consumer and a group
                  await this._deleteRedisConsumerAndGroup(tunnel)

                  await this._consumers[
                    tunnel[tun.CONSUMER]][tun.CONNECTION].quit()
                  this._consumers[
                    tunnel[tun.CONSUMER]][tun.CONNECTION].removeAllListeners()
                  delete this._consumers[tunnel[tun.CONSUMER]]
                  unsubscribe = true
                } else {
                  // Puts back any message with an unsubscribe context.
                  await this.unsubscribe(tunnel)
                }
              }
            }
          }
        }
        if (unsubscribe) {
          return result
        }
        yield result
      }
    } catch (error) {
      this._log.error('Consume error: %o', error)
      throw new RedisChannelsError('Can not consume from the tunnel: ' +
        tunnel[tun.KEY] + ' ' + tunnel[tun.CONSUMER], error)
    }
  }

  /*
  * Closes all redis clients and deletes all consumers and consumer groups
  */
  // --------------------------------------------------------------------------|
  async cleanup () {
    for (const i in this._consumers) {
      await this._deleteRedisConsumerAndGroup(this._consumers[i])

      await this._consumers[i][tun.CONNECTION].quit()
      this._consumers[i][tun.CONNECTION].removeAllListeners()
      delete this._consumers[i]
    }
    await this._nonBlockRedisClient.quit()
    this._nonBlockRedisClient.removeAllListeners()
  }

  /*
  * Deletes a redis consumer and a group
  */
  // --------------------------------------------------------------------------|
  async _deleteRedisConsumerAndGroup (tunnel) {
    try {
      // Deletes a consumer
      await this._nonBlockRedisClient.xgroup(['DELCONSUMER', tunnel[tun.KEY],
        tunnel[tun.TEAM], tunnel[tun.CONSUMER]])

      // Deletes a consumer group
      const teams =
        await this._nonBlockRedisClient.xinfo(['GROUPS', tunnel[tun.KEY]])
      for (const i in teams) {
        // We can not rely on fields exact positions - according to
        // https://redis.io/commands/xinfo.
        const k = teams[i].indexOf('name')
        if (k < 0 || teams[i][k + 1] !== tunnel[tun.TEAM]) {
          continue
        }
        const j = teams[i].indexOf('consumers')
        if (j >= 0 && teams[i][j + 1] === 0) {
          await this._nonBlockRedisClient.xgroup(['DESTROY', tunnel[tun.KEY],
            tunnel[tun.TEAM]])
        }
        break
      }
    } catch { }
  }

  /*
  *
  * Initialize all sorted sets which are used to distribute equable stream
  * keys over the shards.
  *
  * On error throws an exeption
  */
  // --------------------------------------------------------------------------|
  async _initShardScores () {
    try {
      for (let i = 0; i < this._slots; i++) {
        await this._nonBlockRedisClient.zincrby([this._keyZset, 0, i])
      }
    } catch (error) {
      this._log.error('_initShardScores error: %o', error)
      throw new RedisChannelsError(
        'Can not initialize shards score for the channels', error)
    }
  }

  // --------------------------------------------------------------------------|
  _createRedisClient (opts) {
    const { nodes, url, ...options } = opts || {}

    let redis
    if (nodes && Array.isArray(nodes)) {
      // We have a Cluster instance
      redis = new Redis.Cluster(nodes, options)
    } else {
      // We have a Redis instance
      if (url) {
        redis = new Redis(url, options)
      } else {
        redis = new Redis(options)
      }
    }

    redis.addListener('error', () => {
      // Disable all errors.
    })
    return redis
  }

  // --------------------------------------------------------------------------|
  _duplicateRedisClient () {
    const redis = this._nonBlockRedisClient.duplicate()
    redis.addListener('error', () => {
      // Disable all errors.
    })
    return redis
  }
}

module.exports = {
  RedisChannels
}
