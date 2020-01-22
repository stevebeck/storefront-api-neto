import enabledModules from '../src/modules'
const program = require('commander')
const config = require('config')
const common = require('../migrations/.common')
const es = require('../src/lib/elastic')
const { aggregateElasticSearchSchema } = require('../src/lib/module/index')
const aggregatedSchema = aggregateElasticSearchSchema(enabledModules, { config })

program
  .command('rebuild')
  .option('-i|--indexName <indexName>', 'name of the Elasticsearch index', config.elasticsearch.indices[0])
  .action((cmd) => { // TODO: add parallel processing
    if (!cmd.indexName) {
      console.error('error: indexName must be specified');
      process.exit(1);
    }

    let waitingCounter = 0
    for (var collectionName in aggregatedSchema.schemas) {
      console.log('** Hello! I am going to rebuild EXISTING ES index to fix the schema')
      const originalIndex = cmd.indexName + '_' + collectionName;
      const tempIndex = originalIndex + '_' + Math.round(+new Date() / 1000)

      console.log(`** Creating temporary index ${tempIndex}`)
      es.createIndex(common.db, tempIndex, aggregatedSchema.schemas[collectionName], (err) => {
        if (err) {
          console.log(err)
        }

        console.log(`** We will reindex ${originalIndex} with the current schema`)
        es.reIndex(common.db, originalIndex, tempIndex, (err) => {
          if (err) {
            console.log(err)
          }

          console.log('** Removing the original index')
          es.deleteIndex(common.db, originalIndex, (err) => {
            if (err) {
              console.log(err)
            }

            console.log('** Creating alias')
            es.putAlias(common.db, tempIndex, originalIndex, (err) => {
              waitingCounter++
            })
          })
        })
      })
    }
    setInterval(() => {
      if (waitingCounter === Object.keys(aggregatedSchema.schemas).length) process.exit(0)
    }, 1000)
  })

program
  .command('new')
  .option('-i|--indexName <indexName>', 'name of the Elasticsearch index', config.elasticsearch.indices[0])
  .action((cmd) => { // TODO: add parallel processing
    if (!cmd.indexName) {
      console.error('error: indexName must be specified');
      process.exit(1);
    }

    console.log('** Hello! I am going to create NEW ES index')
    const indexName = cmd.indexName

    let waitingCounter = 0
    for (var collectionName in aggregatedSchema.schemas) {
      es.createIndex(common.db, indexName + '_' + collectionName, aggregatedSchema.schemas[collectionName], (err) => {
        if (err) {
          console.log(err)
        }
        waitingCounter++
      })
    }
    setInterval(() => {
      if (waitingCounter === Object.keys(aggregatedSchema.schemas).length) process.exit(0)
    }, 1000)
  })

program
  .on('command:*', () => {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
  });

program
  .parse(process.argv)

process.on('unhandledRejection', (reason, p) => {
  console.error(`Unhandled Rejection at: Promise ${p}, reason: ${reason}`)
  // application specific logging, throwing an error, or other logic here
})

process.on('uncaughtException', (exception) => {
  console.error(exception) // to see your exception details in the console
  // if you are on production, maybe you can send the exception details to your
  // email as well ?
})
