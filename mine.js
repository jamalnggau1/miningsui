import { SuiMaster } from 'suidouble';
import config from './config.js';
import Miner from './includes/Miner.js';
import FomoMiner from './includes/fomo/FomoMiner.js';

const run = async () => {
    const phrase = config.phrase;
    const chain = config.chain;

    if (!config.phrase || !config.chain) {
        throw new Error('phrase and chain parameters are required');
    }

    const suiMasterParams = {
        client: chain,
        debug: !!config.debug,
    };
    if (phrase.indexOf('suiprivkey') === 0) {
        suiMasterParams.privateKey = phrase;
    } else {
        suiMasterParams.phrase = phrase;
    }
    const suiMaster = new SuiMaster(suiMasterParams);
    await suiMaster.initialize();

    console.log('suiMaster connected as ', suiMaster.address);

    const miners = {};

    const doMine = async (minerInstance) => {
        let retryCount = 0; // Menghitung berapa kali sudah mencoba
        const maxRetries = 5; // Batas maksimal percobaan sebelum menyerah

        while (true) {
            try {
                await minerInstance.mine();
                retryCount = 0; // Reset retry counter jika berhasil
            } catch (e) {
                console.error(e);

                // Jika status error adalah 429 (Too Many Requests)
                if (e.status === 429) {
                    retryCount += 1;

                    if (retryCount <= maxRetries) {
                        const retryDelay = 30000 * retryCount; // Penundaan bertambah 30 detik setiap retry
                        console.log(`Too many requests, waiting ${retryDelay / 1000} seconds before retrying...`);

                        await new Promise((res) => setTimeout(res, retryDelay)); // Menunggu sebelum mencoba lagi
                    } else {
                        console.log('Max retries reached. Stopping the miner...');
                        break; // Hentikan jika melebihi batas percobaan
                    }
                } else {
                    console.log('restarting the miner instance...');
                }
            }

            // Delay biasa antara setiap operasi mining
            await new Promise((res) => setTimeout(res, 30000)); // 30 detik (setengah menit) jeda
        }
    };

    if (config.do.meta) {
        const miner = new Miner({
            suiMaster,
            packageId: config.packageId,
            blockStoreId: config.blockStoreId,
            treasuryId: config.treasuryId,
        });
        miners.meta = miner;
        doMine(miners.meta);
    };

    if (config.do.fomo) {
        const fomoMiner = new FomoMiner({
            suiMaster,
            packageId: config.fomo.packageId,
            configId: config.fomo.configId,
            buses: config.fomo.buses,
        });
        miners.fomo = fomoMiner;
        doMine(miners.fomo);
    };
};

run()
    .then(() => {
        console.log('Miner running');
    })
    .catch((err) => {
        console.error('Error starting miner:', err);
    });
