
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
* Clean up the Redis database. Use only for testing!
*
* Note:
*
* After the tests the DB will be flushed, so make sure there's no
* valuable data in it before.
*
* Enviroment:
*
* DB_FLUSH - a boolean, to flush or not the databse, default is 'true'.
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
const { redis, flushdb } = require('../util')

let toFlush = true
if (typeof process.env.DB_FLUSH !== 'undefined' &&
  process.env.DB_FLUSH === 'false') {
  toFlush = false
}

// ----------------------------------------------------------------------------|
async function main () {
  if (toFlush) {
    const conn = redis()
    await flushdb(conn)
    tap.pass('Data base flushed')
  } else {
    tap.pass('Data base not flushed')
  }
  process.exit(0)
}
main()
