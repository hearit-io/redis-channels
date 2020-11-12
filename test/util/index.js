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
* Project ID: BG16RFOP002-1.005-0082-C01
*
* Purpose:
*
* Implements utility functions for testing purposes only..
*
* Enviroment:
*
* REDIS_NODES - a string with a list of redis nodes seprataed by space.
*               If there are more than one node, the connection is to
*               a Redis cluster. Default 127.0.0.1:6379.
*
*               Example: "127.0.0.1:6380 127.0.0.1:6381 127.0.0.1:6382"
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

const Redis = require('ioredis')

/*
* Returns a redis instance with the deafult options.
*/
// ----------------------------------------------------------------------------|
function redis () {
  const envRedisNodes = process.env.REDIS_NODES

  const options = {}
  const nodes = []

  if (envRedisNodes === undefined) {
    options.host = '127.0.0.1'
    options.port = 6379
  } else {
    const elems = envRedisNodes.split(' ')
    if (elems.length === 1) {
      const [host, port] = elems[0].split(':')
      options.host = host
      options.port = port
    } else {
      for (const i in elems) {
        const [host, port] = elems[i].split(':')
        nodes.push({ host: host, port: port })
      }
    }
  }
  // We have a cluster
  if (nodes.length !== 0) {
    options.redisOptions = {
      maxRetriesPerRequest: 2,
      retryStrategy (times) {
        const delay = Math.min(times * 50, 1000)
        return delay
      }
    }
    return new Redis.Cluster(nodes, options)
  }

  // We have a single Redis server
  if (options.length !== 0) {
    options.maxRetriesPerRequest = 2
    options.retryStrategy = function retryStrategy (times) {
      const delay = Math.min(times * 50, 1000)
      return delay
    }
    return new Redis(options)
  }
}

/*
*
* Gets the default redis options for the testing environment.
*/
// ----------------------------------------------------------------------------|
function getRedisOptions () {
  const envRedisNodes = process.env.REDIS_NODES

  const options = {}
  const nodes = []

  if (envRedisNodes === undefined) {
    options.host = '127.0.0.1'
    options.port = 6379
  } else {
    const elems = envRedisNodes.split(' ')
    if (elems.length === 1) {
      const [host, port] = elems[0].split(':')
      options.host = host
      options.port = parseInt(port)
    } else {
      for (const i in elems) {
        const [host, port] = elems[i].split(':')
        nodes.push({ host: host, port: parseInt(port) })
      }
    }
  }
  // We have a cluster
  if (nodes.length !== 0) {
    options.redisOptions = {
      maxRetriesPerRequest: 2,
      retryStrategy (times) {
        const delay = Math.min(times * 50, 1000)
        return delay
      }
    }

    let result = Object.assign({}, { nodes: nodes })
    result = Object.assign(result, options)
    return result
  }

  // We have a single Redis server
  if (options.length !== 0) {
    options.maxRetriesPerRequest = 2
    options.retryStrategy = function retryStrategy (times) {
      const delay = Math.min(times * 50, 1000)
      return delay
    }
    return options
  }
}

/*
*
* Flushes a redis DB.
*/
// ----------------------------------------------------------------------------|
async function flushdb (client) {
  await client.ping('OK')
  if (typeof client.nodes !== 'undefined') {
    const nodes = client.nodes()
    for (const node of nodes) {
      if (node && node.options && !node.options.readOnly) {
        await node.flushdb()
      }
    }
  } else {
    await client.flushall()
  }
}

/**
 * Sleeps miliseconds, promise based.
 */
// ----------------------------------------------------------------------------|
function sleep (delay) {
  return new Promise(function (resolve) {
    setTimeout(resolve, delay)
  })
}

module.exports = {
  sleep,
  redis,
  flushdb,
  getRedisOptions
}
