const Apify = require('apify');
const httpRequest = require('@apify/http-request');

Apify.main(async () => {
    // const { email } = await Apify.getInput();
    // get aggregatorData and assign it to respective variable
    const { body: aggregatorData } = await httpRequest({
        url: 'https://api.apify.com/v2/key-value-stores/tVaYRsPHLjNdNBu7S/records/LATEST?disableRedirect=true',
        json: true,
    });
    // get worldometerData and assign it to respective variable
    const { body: worldometerDataRaw } = await httpRequest({
        url: 'https://api.apify.com/v2/key-value-stores/SmuuI0oebnTWjRTUh/records/LATEST?disableRedirect=true',
        json: true,
    });
    const worldometerData = worldometerDataRaw.regionData;

    // create an array of keys from aggregatorData
    const keys = aggregatorData.map(e => e.country);

    // we'll assign the values here
    const result = {};

    // for each key (country from the set we created)
    for (const key of keys) {
        const countries = {
            "Czech Republic": "Czechia",
            "United Kingdom": "UK",
            "United States": "USA",
            "South Korea": "S. Korea"
        }
        result[key] = {}; // create an object first with a selected key
        const adItem = aggregatorData.find(item => item.country === key);
        // const adItem = aggregatorData.find(item => item.country === key || item.country === countries[key]);
        const wmItem = worldometerData.find(item => item.country === key  || item.country === countries[key]);
        // now let's save the found values (if found, otherwise null)
        result[key].infected_Apify = adItem ? adItem.infected : null;
        result[key].infected_WM = wmItem ? wmItem.totalCases : null;
    }

    let highDeviation = false;
    const resultWithoutZeroDeviation = {};
    const resultWithHighDeviation = {};
    const resultForWorldometer = {};
    // let's iterate through each key and save the deviation if entry was present in both files
    for (const key of Object.keys(result)) {
        if (result[key].infected_WM && result[key].infected_Apify) {
            // that's just a rough calculation - difference vs one of the values
            result[key].deviation_percent = ((result[key].infected_WM - result[key].infected_Apify) / result[key].infected_Apify * 100).toFixed(2);
        } else {
            // or just save null
            result[key].deviation_percent = null;
        }
        // mark if the deviation_percent is over 5% for at least one of the counties
        if (result[key].deviation_percent && Math.abs(result[key].deviation_percent) >= 5) highDeviation = true;

        // save Object with all countries which are different at all or null
        if ((result[key].deviation_percent && result[key].deviation_percent > 0) || (result[key].deviation_percent && result[key].deviation_percent < 0) || (result[key].deviation_percent === null)) { resultWithoutZeroDeviation[key] = result[key] }

        // save Object with all countries which are different by more then 5%
        if ((result[key].deviation_percent && Math.abs(result[key].deviation_percent) >= 5) || (result[key].deviation_percent === null)) { resultWithHighDeviation[key] = result[key] };

        // save Object with all countries where we are forward from WM
        if ((result[key].deviation_percent && result[key].deviation_percent < 0)) { resultForWorldometer[key] = result[key] };

    }
    if (highDeviation) {
        // Then we save report to KVS        
        await Apify.setValue('CRITICAL_DEVIATIONS', resultWithHighDeviation);
        await Apify.setValue('APIFY_MORE_THEN_WM', resultForWorldometer);
        // Or create a dataset
        await Apify.pushData(resultWithoutZeroDeviation);
    }

    // let highDeviation = false;
    // // let's iterate through each key and save the deviation if entry was present in both files
    // for (const key of Object.keys(result)) {
    //     if (result[key].infected_WM && result[key].infected_Apify) {
    //         // that's just a rough calculation - difference vs one of the values
    //         result[key].deviation = (result[key].infected_WM - result[key].infected_Apify) / result[key].infected_Apify * 100;
    //     } else {
    //         // or just save null
    //         result[key].deviation = null;
    //     }
    //     // mark if the deviation is over 5% for at least one of the counties
    //     if (result[key].deviation && Math.abs(result[key].deviation) >= 5) highDeviation = true;
    // }

    // // await Apify.pushData('result');

    // // if there's at least one country with deviation over 5%



    // if (highDeviation) {
    //     // Then we save report to OUTPUT
    //     await Apify.setValue('OUTPUT', result);
    //     // const output = result.filter(x => (x.deviation > 0 || x.deviation < 0 ))
    //     // await Apify.setValue('OUTPUT', output);
    //     // try {
    //     //     const env = Apify.getEnv();
    //     //     // And send email with the link to this report
    //     //     await Apify.call('apify/send-mail', {
    //     //         to: email,
    //     //         subject: 'COVID-19 Statistics Checker found deviation over 5% for some countries',
    //     //         html: `H!.${'<br/>'}Some countries have deviation over 5% between Aggregator and Worldometer Data.${'<br/>'}Details <a href="https://api.apify.com/v2/key-value-stores/${env.defaultKeyValueStoreId}/records/OUTPUT?disableRedirect=true">here</a>.`,
    //     //     }, { waitSecs: 0 });
    //     // } catch (e) {}
    // }
});
