// ============================================================================|
/*
*
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
* The entry point.
*
* Description:
*
*
* Exported classes:
*
* RedisChannels, RedisChannelsError
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

const { RedisChannels } = require('./channels.js')
const { RedisChannelsError } = require('./errors.js')

module.exports = {
  RedisChannels,
  RedisChannelsError
}
