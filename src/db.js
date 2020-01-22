import config from 'config'
import * as redis from '../src/lib/redis'
import * as elastic from '../src/lib/elastic'

export const dbContext = {
  getRedisClient: () => redis.getClient(config),
  getElasticClient: () => elastic.getClient(config)
}

export default function initializeDb (callback) {
  // connect to a database if needed, then pass it to `callback`:
  callback(dbContext);
}
