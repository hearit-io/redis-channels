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
* Test the channels implementation. It produces/consumes messages in/from
* channels groups in a real Redis DB.
*
* Enviroment:
*
* Follwing environment variables can be used to configure the tests:
*
* REDIS_NODES - a string with a list of redis nodes seprataed by space.
*               If there are more than one node, the connection is to
*               a Redis cluster. Default 127.0.0.1:6379.
*
*               Example: "127.0.0.1:6380 127.0.0.1:6381 127.0.0.1:6382"
*
* GROUP_PREFIX - a prefix for the group name, default 'GROUP'.
*
* NUMBER_OF_GROUPS - a number of groups, defualt 10.
*
* NUMBER_OF_MESSAGES - a number of produced messages per group, default 100.
*
* NUMBER_OF_CONSUMERS -  a number of consumers per group, default 10.
*
* SHARDED - a boolean, to use sharded channels or not, default is 'false'.
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
const test = require('./channels.js')

const application = 'test'
const version = 1

const groupName = process.env.GROUP_PREFIX || 'GROUP'
const numberOfGroups = process.env.NUMBER_OF_GROUPS || 10
const numberOfMessagesToProducePerGroup =
  process.env.NUMBER_OF_MESSAGES || 100
const numberOfConsumersPerGroup = process.env.NUMBER_OF_CONSUMERS || 10

let sharded = false
if (typeof process.env.SHARDED !== 'undefined' &&
  process.env.SHARDED === 'true') {
  sharded = true
}

const core = 1
// ----------------------------------------------------------------------------|
async function main () {
  try {
    await tap.teardown(async () => {
      process.exit(0)
    })

    await tap.test('Heavy test core : ' + core, async t => {
      let plan = numberOfGroups * numberOfConsumersPerGroup
      plan = plan * numberOfMessagesToProducePerGroup
      plan += numberOfGroups * numberOfMessagesToProducePerGroup
      console.log('PLAN : ', plan)
      t.plan(plan)

      await test(core, t, application, version, groupName, numberOfGroups,
        numberOfConsumersPerGroup, numberOfMessagesToProducePerGroup, sharded)
    })
  } catch (error) {
    console.log(error)
  }
}
main()
