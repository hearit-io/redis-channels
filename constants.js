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
* Defines all used constants in the package.
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

// ----------------------------------------------------------------------------|
// Common definitions
// ----------------------------------------------------------------------------|

// Separators used to compose Redis keys and indexes.
const sep = {
  HASH: '#',
  STREAM: '|',
  INDEX: ':',
  OPEN: '[',
  CLOSE: ']',
  BIND: '-'
}
Object.freeze(sep)

// ----------------------------------------------------------------------------|
// The application is prepared for using a Redis cluster, it uses a fixed
// pre-sharded approach.
//
// All the stream keys are fix sharded by including a hash tags in
// the key. We split the hash slots (16384) in 32 or 64 shards in order to
// implement load balancing in a cluster environment.
//
// The stream keys are going to be dynamically evenly distributed
// during creation time. A look-up hash and sorted set will be used to
// update the mapping.
// ----------------------------------------------------------------------------|

const shards32 = [
  '{10}', '{113}', '{21}', '{3}',
  '{61}', '{72}', '{50}', '{43}',
  '{11}', '{112}', '{20}', '{2}',
  '{60}', '{73}', '{51}', '{42}',
  '{12}', '{111}', '{23}', '{1}',
  '{63}', '{70}', '{52}', '{41}',
  '{13}', '{110}', '{22}', '{0}',
  '{62}', '{71}', '{53}', '{40}'
]

const shards64 = [
  '{10}', '{18}', '{113}', '{342}', '{29}', '{21}',
  '{3}', '{122}', '{69}', '{61}', '{72}', '{162}',
  '{50}', '{58}', '{153}', '{43}', '{11}', '{19}',
  '{112}', '{343}', '{28}', '{20}', '{2}', '{123}',
  '{68}', '{60}', '{73}', '{163}', '{51}', '{59}',
  '{152}', '{42}', '{12}', '{102}', '{111}', '{119}',
  '{133}', '{23}', '{1}', '{9}', '{173}', '{63}',
  '{70}', '{78}', '{52}', '{142}', '{49}', '{41}',
  '{13}', '{103}', '{110}', '{118}', '{132}', '{22}',
  '{0}', '{8}', '{172}', '{62}', '{71}', '{79}',
  '{53}', '{143}', '{48}', '{40}'
]

const shards = {
  32: shards32,
  64: shards64
}
Object.freeze(shards)

const origin = {
  CONTEXT: 'context',
  CONTENT: 'content'
}
Object.freeze(origin)

const context = {
  UNSUBSCRIBE: 'unsubscribe',
  ORIGIN: 'origin'
}
Object.freeze(context)

// ----------------------------------------------------------------------------|
// Channel definitions
// ----------------------------------------------------------------------------|
// Property names used in the option properites.
//
const opt = {
  // Channels options
  CHANNELS: 'channels',
  LOG: 'log',
  OVERFLOW: 'overflow',
  SCHEMA: 'schema',
  SLOTS: 'slots',
  VESRION: 'version',
  APPLICATION: 'application',
  SHARDED: 'sharded',
  // Redis options
  REDIS: 'redis',
  NODES: 'nodes',
  URL: 'url'
}
Object.freeze(opt)

const tun = {
  TEAM: 'team',
  CONNECTION: 'connection',
  CONSUMER: 'consumer',
  KEY: 'key'
}
Object.freeze(tun)

const msg = {
  ID: 'id',
  DATA: 'data'
}
Object.freeze(msg)

// ----------------------------------------------------------------------------|
// Key parts used in the pre-sharded mapping (hash and sorted sets).
const pre = {
  KEYS: 'keys',
  SHARDS: 'shards'
}
Object.freeze(pre)

//
// The maximum number of elements in a stream before overflow (overwrite).
//
const overflowStreamElemNumber = 100

//
// Consumer block time out in milliseconds (used in XREADGROUP).
//
const blockStreamConsumerTimeOutMs = 10000

//
// The maximum number of elements to consume in one run (used in XREADGROUP).
//
const maxMessageStreamConsumePerRun = 100

//
// Defaults
//
const defaultAppName = 'app'

const defaultVersion = 1

const defaultSlotsNumb = 32

const defaultSchema = 'channels'

const defaultOriginType = 'all'

module.exports = {
  sep,
  opt,
  pre,
  tun,
  msg,
  origin,
  shards,
  context,
  defaultSchema,
  defaultAppName,
  defaultVersion,
  defaultSlotsNumb,
  defaultOriginType,
  overflowStreamElemNumber,
  blockStreamConsumerTimeOutMs,
  maxMessageStreamConsumePerRun
}
