

import {createClient} from 'redis'
import {env} from '../config/env.js'
const redis = createClient({
    url: env.REDIS_URL
});

redis.on('error', (err) => console.log('Redis Client Error', err));
redis.on('connect', () => console.log('Redis Client Connected'));

await redis.connect();


export default redis;