# @hearit-io/redis-channels

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](code_of_conduct.md)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
![NPM License](https://img.shields.io/npm/l/@hearit-io/redis-channels)
![NPM Downloads](https://img.shields.io/npm/dt/@hearit-io/redis-channels)

It is a fast, reliable, and scalable message broker implementation based on Redis streams.

Suitable for IoT applications with massive network traffic, pub/sub-use cases, or any implementation with multiple producers/consumers.

Allows simple integration with SSE(Server-Sent Event)/WebSocket implementation. See our SSE Fastify based [example](https://github.com/hearit-io/fastify-redis-channels-sse-example).

See a live SSE frontend implementation used in our `HEARIT.IO` project [here](https://app.hearit.io/static/app.hearit.io/push.mjs)

Implements a possibility to scale the message processing across different consumers, without single consumers having to process all the messages. A group of consumers, working as a team, can cooperate and consume a separate portion of those messages from the same channel.

It can be used with a single Redis instance and later updated easily to a cluster configuration without the need for any application change. Under the hood [ioredis](https://github.com/luin/ioredis) is used as a client.

Simple integration in web frameworks, already available plug-in [fastify-redis-channels](https://github.com/hearit-io/fastify-redis-channels#readme) for our favorite framework [Fastify](https://www.fastify.io/). See all step-by-step examples there. 

The implementation uses native Promises.

Do you want your project to grow? Then start right from the begging.

## Table of Contents

* [Install](#install)
* [Usage example](#usage-example)
* [API Documentation](#api-documentation)
* [Error handling](#error-handling)
* [Running tests](#running-tests)
* [Tunning Redis and OS](#tunning-redis-and-os)
* [TODO](#todo)
* [Benchmarks](#benchmarks)
* [Project status](#project-status)
* [Authors and acknowledgment](#authors-and-acknowledgment)
* [License](#license)


## Install

```shell
$ npm install @hearit-io/redis-channels --save
```

## Usage example

Requires running Redis server on a host `localhost` and a port 6379.

### Every consumer processes all messages

```javascript
'use strict'

const {RedisChannels} = require('@hearit-io/redis-channels')

// A consumer implementation
async function consume(tunnel, channels) {
  for await (const messages of channels.consume(tunnel)) {
    for (const i in messages) {
      // Do something with messages
      console.log(messages[i].data)
    }
  }
}


async function main () {
  try {
  
    const channels = new RedisChannels()
    const tunnelProducer = await channels.use('room')
    
    const tunnelConsumerOne = await channels.use('room')
    const tunnelConsumerTwo = await channels.use('room')
    
    // Subscribe consumer tunnels
    await channels.subscribe(tunnelConsumerOne)
    await channels.subscribe(tunnelConsumerTwo)

    // Start consuming 
    consume(tunnelConsumerOne).catch((error) => {
      console.error(error)
    })
    consume(tunnelConsumerTwo).catch((error) => {
      console.error(error)
    })

    // Produce messages
    await channels.produce(tunnelProducer, 'Hello')
    await channels.produce(tunnelProducer, 'Wold')

    // Unsubscribe all consumers
    await channels.unsubscribe(tunnelConsumerOne)
    await channels.unsubscribe(tunnelConsumerTwo)

    // Delete a channel related to the 'room'.
    await channels.delete('room')
  }
  catch (error) {
    console.error(error)
  }
}
main()
```
The result on the console is:

```shell
Hello
World
Hello
World
```

### Consumer's team

In order to create a group of consumers (a team) which cooperates consuming a different portion of the messages form the same channel, just add a `team` parameter in the `subscribe`method like this:


```javascript
 
 // Subscribe consumer tunnels
 await channels.subscribe(tunnelConsumerOne, 'team')
 await channels.subscribe(tunnelConsumerTwo, 'team')
 
```

The result on the console is:

```shell
Hello
World
```

## API Documentation
### new RedisChannels([options])
Creates an instance of a RedisChannels class. It uses [ioredis](https://github.com/luin/ioredis#readme) to manage connections to a Redis.
#### Options:

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| channels | Object | | Options related to channels |
| channels.application | string | 'app' | Application name, used as a prefix part in the Redis key |
| channels.version | number | 1 |  Version number, used as a prefix part in the Redis key |
| channels.schema | string | 'channel' | Schema name, used as a prefix part in the Redis key |
| channels.overflow | number | 100 | Trims the channel size (approximately), but never less than the specified number of elements. You must choose a value suitable for your use case and available memory |
| channels.slots | number | 32 | The number of pre-sharded slots. Possible values are `32` or `64` |
| channels.sharded | boolean | false | Whether the channels will be spread even over the shards. It makes sense if your application connects to a Redis cluster |
| channels.log | Object | | A logger instance, by default logging is disabled, we use [abstract-logging](https://www.npmjs.com/package/abstract-logging) for this purpose |
| redis | Object | | Options for a Redis clients |
| redis.nodes | Array | | An array of nodes in the cluster, [{ port: number, host: string }]. If nodes are defined a connection to a cluster will be tried. |
| redis.url | string | | A URL string to a single Redis server, for example `'redis://user:password@redis-service.com:6379/'` |
| redis.host | string | 'localhost' | A host name of a single Redis server |
| redis.port | number | 6379 | A port number to connect to a single Redis server | 
| redis.... | Rest properites |  | Any other options will be passed to the [Redis](https://github.com/luin/ioredis/blob/master/API.md#Redis) or the [Cluster](https://github.com/luin/ioredis/blob/master/API.md#Cluster) client | 


#### Examples

Channels will use a Redis cluster connected to three nodes with enabled offline queue in a sharded mode. 

```javascript
'use strict'

const {RedisChannels} = require('@hearit-io/redis-channels')

const options = {
  channels: {
    sharded: true
  },
  redis: {
    nodes: [
      { host: '127.0.0.1', port: 6380 },
      { host: '127.0.0.1', port: 6381 },
      { host: '127.0.0.1', port: 6382 }
    ],
    options: {
      enableOfflineQueue: true
    }
  }
}
const channels = new RedisChannels(options)
```

Channels will use a single Redis connection defined with a URL and keep alive set to 10 seconds.

```javascript
'use strict'

const {RedisChannels} = require('@hearit-io/redis-channels')

const options = {
  redis: {
    url: 'redis://10.101.201.100:3333',
    keepAlive: 10000
  }
}
const channels = new RedisChannels(options)
```

The same as above but defined with a host and port.

```javascript
'use strict'

const {RedisChannels} = require('@hearit-io/redis-channels')

const options = {
  redis: {
    host: '10.101.201.100',
    port: 3333,
    keepAlive: 10000
  }
}
const channels = new RedisChannels(options)
```

### RedisChannels methods


#### channels.use(group)

Creates a `tunnel` Object required to do any further operation with the channel associated with the `group`.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| group | string | | A name of a channel group (i.e. chat room etc.) |

Returns a **Promise** to a `tunnel` Object.

#### channels.produce(tunnel, message[, type = 'all'])

Produces a message to a channel.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| tunnel | Object | | A tunnel required to peform any operation with the channel |
| message | string | | A message to produce |
| type | string | 'all' | Identifies a message source (origination) |

Returns a **Promise**.


#### channels.subscribe(tunnel[, team, consumer])

Subscribes a `tunnel` to make possible a consume operation.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| tunnel | Object | | A tunnel required to perform any operation with the channel |
| team | string | the same as a consumer | A name of a consumer team. If specified, every consumer within a team will receive different part of the messages arrived in the channels  |
| consumer | string | a generated v4 uuid | A unique consumer name within a team  |

Returns a **Promise**.

#### channels.consume(tunnel[, type = 'all', count = 100, timeout = 10000, fromId = time_in_milisecounds-sequence, messageOnTimeOut = false])

It is an asynchronous iterator which returns an array of messages. 

Every message is a couple of `{ id: <string>, data: <string> }`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| tunnel | Object | | A tunnel required to peform any operation with the channel |
| type | string | 'all' | Identifies a message source (origination) to consume |
| count | number | 100 | Defines a maximum number of messages consumed per iteration |
| timeout | number | 10000 | A blocking timeout in milliseconds |
| fromId | string | '>' or '*' | Starts consuming messages newer then a given id. Default value is set to `>` or `*` whether if it is consumed in a team or not. This means staring form messages that were never delivered to any other consumer. The format is `time_in_milisecounds-sequence` or only the miliseconds part of the id.|
| messageOnTimeOut | boolean | false |If set, in a case of a timeout a message array [{id: <last-consumed-id> data: null}] will be returned to indecate it. If there were no consumed messages the id value will be undefined. This feature is usefull if you want to build in your consumer an additional functionality - for example sending to an SSE(Service Send Event)/websocket ping messages on every consumer timeout.|

Returns a **Promise** to an Array of Objects.


#### channels.unsubscribe(tunnel)

Unsubscribes form a `tunnel`. This causes the `consume` method to finish with the iteration and cleans up the associated consumer.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| tunnel | Object | | A tunnel required to peform any operation with the channel. Use only subscribed tunnels, otherways an exception will throw.  |

Returns a **Promise**.

#### channels.delete(group)

Deletes all data in the Redis database associated with the `group`. 

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| group | string | | A name of a channel group (i.e. chat room etc.) |

Returns a **Promise** .

#### channels.cleanup()

Closes all redis clients and deletes all consumers/consumer groups. Useful in agraceful application shutdown.

Returns a **Promise** .
 
## Error handling

In an error all methods throw an instance of `RedisChannelsError` class. 

It has following properties:

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| message | string | | An error description |
| error | Object | | An error object caused the exception |

A usage example of an error handling:

```javascript
'use strict'
const {RedisChannels, RedisChannelsError} = require('@hearit-io/redis-channels')

try {
   // Your code
} 
catch (exception) {
   if (exception instanceof RedisChannelsError) {
      // Handle the error
      console.error(exception.message)
      console.error (exception.error)
   }
}
```

## Running tests

We want to deliver the highest possible quality to our valuable open source community by implementing 100 % test coverage for all packages.

To run the test cases a running Redis server is required. 

In the environment variable REDIS_NODES you can set a list of Redis nodes separated by space as example:

```shell
export REDIS_NODES="127.0.0.1:6380 127.0.0.1:6381 127.0.0.1:6382"
```
If there are more than one entry in the list a connection to a Redis Cluster will be used for the tests. 
If REDIS_NODES is not set a connection to 127.0.0.1:6379 will be tried.

Similar to a variable `REDIS_NODES`, a variable `REDIS_DOWN_NODES` is used in the test cases covering missing connection to a Redis server. A default value is '127.0.0.1:3333'.

After each test, the data base will be FLUSHED. Please make sure there is **no valuable data** in the data base before running the tests!

### Unit tests

Start the unit tests with:

```shell
npm test
```

### Heavy load/reach the limit tests

The purpose of those tests is to verify the behavior of your system in a situation of a massive traffic - go to the limits. 

This can be used to estimate the maximum number of consumer/producers, the throughput, and the need of operation system tunning.  

You can use following environment variables to configure your tests:

* `NUMBER_OF_GROUPS` - defines the number of channel groups (i. e. chat rooms, ...). Default value is 10.
* `NUMBER_OF_MESSAGES` - number of messages to produce per group. Default value is 100
* `NUMBER_OF_CONSUMERS` - number of consumers per group. Default value is 10
* `SHARDED` - If channels sharded mode will be used. Default value is 'false', to enable it set to 'true'
* `GROUP_PREFIX` - The prefix for the group name. Default value is 'GROUP'.

Following command starts four `node` processes:

```shell
cd ./test/heavy-load 
./heavy-run.sh
```

The test results for each process can be found in the `./test/heavy-load/log` directory.

To clean-up the data base call:

```shell
./heavy-run-cleanup.sh
```

Make sure there is **no valuable data** in the data base before running the tests!


## Tunning Redis and OS

You may need to adapt `maxclients` configuration parameter in the Redis server confg file (usually `/etc/redis.conf`). For more details see the Redis [documentation](https://redis.io/topics/clients) about this topic.

On a Unix based system increase the maximum allowed number of temporary ports.

Check the current system value of local port range with:

```shell
cat /proc/sys/net/ipv4/ip_local_port_range  
```

Increase the value by defining a bigger range, for example with the command:

```shell
echo "1024 65535" > /proc/sys/net/ipv4/ip_local_port_range
```
To make the change permanent add following line in `/etc/sysctl.conf` file:

```shell
net.ipv4.ip_local_port_range = 1024 65535
```

Check the used TCP and UDP connection with the command:

```shell
netstat -an | grep -e tcp -e udp | wc -l
```

or 
 
```shell
ss -s
```
## Benchmarks

We reached follwing values in our benchmark tests on a Linux Debain server with 64 GB memory, single i7-7700 CPU 3.60GHz:

* Message size - `4 000` bytes.
* Number of Redis servers - `1`.
* Number of node processes - `4`.
* Number of channels groups (i.e. chat rooms, ...) - `3 000`.
* Number of consumers - `30 000`.
* Number of produced messages - `300 000`.
* Number of consumed messages - `3 000 000`.
* Avarage processed messages per second - `24 200`.


## TODO

The list of already implemented / planed features:

- [x] Limit the maximum number of channel elements in the `produce` method (capped streams).
- [x] Implement a scenario where all consumers are served with the same messages arrived in the channels.
- [x] Add Benchmarks.
- [x] Implement a scenario where consumers are served with the different part of the messages arrived in the channels (a work in a team).
- [x] Introduce a parameter in the `consume` method which allows starting message consuming form a given period in the past.
- [ ] Implement consume with acknowledge functionality.
- [ ] Implement a channel monitoring capability.
- [ ] TypeScript support.

## Project status

### [hearit.io](https://hearit.io)


<img src="https://raw.githubusercontent.com/hearit-io/graphics/main/hearing-black-96dp.svg" width="48" height="48"/> | Smart home automatization designed for visually impaired people.
------------ | -------------

**@heart-io/redis-channels** is used productive in our progressive web [app](https://app.hearit.io). You can try it with a user `demo@hearit.io` and password: `11223344`

The package will be updated and maintained regularly.

The main goal of [hearit.io](https://hearit.io) is to make accessible the world of IoT to everyone. We created a speaking home suitable for all.

We will be grateful to you if you make awareness to other people of our project. 

To finance our idea, we would be glad to support and work on your projects. Contact Emil <emil@hearit.io> for details and our availability.

Other open-source packages, part of our project, will be available soon. We use [Fastify](http://fastify.io) as an application framework.

## Authors and acknowledgment

Emil Usunov

[hearit.io](https://hearit.io)

## License

MIT
