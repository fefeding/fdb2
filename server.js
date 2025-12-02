
const TarsConfig = require('@tars/config');

async function loadConfigs() {
    console.log(process.env.TARS_CONFIG);
    if(process.env.TARS_CONFIG) {
        const tars = new TarsConfig();
        const list = await tars.loadList();
        //const configs = await tars.loadConfig();
        console.log('loaded list', list);
        if(list.length) {
            for(const key of list) {
                const con = await tars.loadConfig(key, {
                    format: 'TEXT'
                });
                console.log('loaded config', key, con);
                process.env[key] = con;
            }
        }
    }
}

loadConfigs().then(()=>{
    require('./bootstrap.js');
});

