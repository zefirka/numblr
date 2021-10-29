import {parseStringPromise} from 'xml2js';
import axios from 'axios';
import {noop} from 'lodash';

const parseFromUrl = (url = '') => {
    return url.replace(/\.tumblr\.com.+$/, '').replace('https://', '');
};

const getPhotosFromPost = (post: TumblrPost) => {
    const photos = [];
    if (post['photo-url']) {
        const list = post['photo-url'];
        console.log('list', list);
        const probePhoto = list.find(({$}) => {
            const mw = $['max-width'];
            return mw && Number(mw) <= 400 && Number(mw) >= 150;
        });

        probePhoto && photos.push(probePhoto._ || list[0]._);
    }
    if (post['regular-body']) {
        let body = post['regular-body'];
        body = Array.isArray(body) ? body.join('') : body;
        const r = body.matchAll(/src="([^"]+)"/g);

        let n = r.next();
        while (!n.done) {
            photos.push(n.value[1]);
            n = r.next();
        }
    }

    return photos;
};

export type TumblrPost = {
    $: {
        url: string;
        'reblogged-from-url': string;
        'reblogged-root-url': string;
    };
    'photo-url': {$: {'max-width': number}; _: string}[];
    'regular-body': string | string[];
    photoset: unknown[];
};
type TumblrData = {
    tumblr: {
        posts: [
            {
                post: TumblrPost[];
            },
        ];
    };
};

export type PostMap = {
    idx: number;
    url: string;
    reblogged?: string;
    rebloggedRoot?: string;
    photoset: unknown[];
    photos: string[];
};

export default class Crawler {
    useCache: boolean;
    cache: Record<string, PostMap[][]>;
    limit: number;

    constructor(limit: number, useCache: boolean) {
        this.limit = limit;
        this.useCache = useCache;
        this.cache = {};
    }

    async getNextAndCache(account: string, from: number) {
        const result = await this._getPosts(account, from);
        this.cache[account] = this.cache[account] || [];
        this.cache[account][from] = result;

        return result;
    }

    async getPosts(account: string, from: number) {
        const limit = Number(this.limit);
        const cached = this.cache[account];

        if (this.useCache && cached && cached[from]) {
            const result = cached[from];
            setTimeout(() => {
                delete cached[from];
            });

            return {
                from,
                limit,
                fromCache: true,
                items: result,
            };
        }

        const result = await this._getPosts(account, from);

        if (this.useCache) {
            this.getNextAndCache(account, from + limit).catch(noop);
            this.getNextAndCache(account, from + 2 * limit).catch(noop);
        }

        return {
            from,
            limit,
            items: result,
            fromCache: false,
        };
    }

    async _getPosts(account: string, from: number) {
        try {
            const url = `https://${account}.tumblr.com/api/read?type=photo&num=${this.limit}&start=${from}`;
            console.log('Calling ' + url);

            const data = await axios.get(url);
            const xml: TumblrData = await parseStringPromise(data.data);

            const posts = xml.tumblr.posts[0].post;

            if (!posts || !posts.length) {
                return [];
            }

            const result: PostMap[] = posts.map((post, i) => {
                const meta = post.$;
                return {
                    idx: i,
                    url: meta.url,
                    reblogged: parseFromUrl(meta['reblogged-from-url']),
                    rebloggedRoot: parseFromUrl(meta['reblogged-root-url']),
                    photoset: post.photoset,
                    photos: getPhotosFromPost(post),
                };
            });

            return result;
        } catch (err) {
            console.error(err);
            return [];
        }
    }
}
