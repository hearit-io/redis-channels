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
* Purpose: Defines the package errors.
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

class RedisChannelsError extends Error {
  constructor (message, error = null) {
    super(message)
    this.error = error
    Error.captureStackTrace(this, RedisChannelsError)
  }
}

module.exports = { RedisChannelsError }
