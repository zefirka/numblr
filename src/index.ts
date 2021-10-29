import fs from 'fs';
import {resolve} from 'path';

import {shuffle} from 'lodash';
import axios from 'axios';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';

import config from './config';
import {__DIR} from './util';
import Crawler from './crawler';

const crawler = new Crawler(config.pageSize, config.useCache);

const STATIC_DIR = resolve(__DIR, 'static');

const cache: Record<string, string[]> = {};
const PAGE_SIZE = 20;

const readCached = (f: string, {random = false, nocache = false}) => {
    if (cache[f] && !nocache) return cache[f];
    cache[f] = fs.readdirSync(resolve(STATIC_DIR, f));
    if (random) {
        cache[f] = shuffle(cache[f]);
    }
    return cache[f];
};

const read = (folder: string, offset: number, {random = false, nocache = false}) => {
    const folderContent = readCached(folder, {random, nocache});
    return folderContent.slice(offset, offset + PAGE_SIZE);
};

const render = (f: string, data: Record<string, string>) => {
    const file = fs.readFileSync(f, 'utf-8');

    return file.replace(/{{(\w+)}}/g, (i, g) => {
        return data[g] || i;
    });
};

const app = express();

app.set('query parser', 'extended');
app.use(express.static(STATIC_DIR));
app.use(bodyParser.json());
app.use(cors({origin: '*'}));

app.get('/folders', (req, res) => {
    res.json(fs.readdirSync(__dirname));
});

app.get('/save/:folder/:img', (req, res) => {
    const {img, folder} = req.params;
    fs.copyFile(resolve(STATIC_DIR, folder, img), resolve(STATIC_DIR, './saved/' + img), (err) => {
        if (err) throw err;

        res.json({ok: true});
    });
});

app.post('/load', async (req, res) => {
    const response = await axios({
        url: req.body.url,
        method: 'GET',
        responseType: 'blob',
    });
    res.send(response);
});

app.post('/download', async (req, res) => {
    const response = await axios({
        url: req.body.url,
        method: 'GET',
        responseType: 'blob',
    });
    const names = req.body.url.split('/');
    const name = names.pop();

    const path = resolve(STATIC_DIR, './saved/', name);
    try {
        const writer = fs.createWriteStream(path);

        response.data.pipe(writer);

        writer.on('finish', () => res.json({ok: true}));
        writer.on('error', (err) => {
            console.log('err', err);
            res.status(500).json({ok: false});
        });
    } catch (err) {
        console.log('err', err);
        res.status(500).json({ok: false});
    }
});

app.get('/items/saved/:offset', (req, res) => {
    const {offset} = req.params;
    const data = read('saved', Number(offset), req.query).map((img) => {
        return {
            photos: [{thumb: '/saved/' + img, hres: '/saved/' + img}],
        };
    });
    return res.json({items: data});
});

app.get('/items/:account/:offset', async (req, res) => {
    const {account, offset} = req.params;
    const posts = await crawler.getPosts(account, Number(offset));
    res.json(posts);
});

app.get('/view/:folder/:offset', (req, res) => {
    const {folder, offset} = req.params;
    const data = read(folder, Number(offset), req.query);
    return res.json(data);
});

app.get('/', (req, res) => {
    const folders = fs.readdirSync(STATIC_DIR);
    const data = {
        folders: folders.map((f) => `<div><a href="/folder/${f}">${f}</a></div>`).join('\n'),
    };
    res.send(render(resolve(__DIR, 'templates/index.html'), data));
});

app.get('/folder/:folder', (req, res) => {
    console.log('config', config);
    res.send(
        render(resolve(__DIR, 'templates/view.html'), {
            folder: req.params.folder,
            configs: JSON.stringify(config),
        }),
    );
});

app.listen(config.port, () => {
    console.log(`Server ready on http://localhost:${config.port}`);
});
