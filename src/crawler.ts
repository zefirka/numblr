import {parseStringPromise} from 'xml2js';
import axios from 'axios';
import {noop} from 'lodash';

const parseFromUrl = (url = '') => {
    const res = url.replace(/\.tumblr\.com.+$/, '').replace('https://', '');

    if (res.includes('deactivated')) {
        return '';
    }

    return res;
};

const getPhotosFromPost = (post: TumblrPost) => {
    const photos = [];

    if (post['photo-url']) {
        const list = post['photo-url'];
        const max = list[0]._;
        const probePhoto = list
            .sort((a, b) => {
                return (Number(a.$['max-width']) || 0) - (Number(b.$['max-width']) || 0);
            })
            .find(({$}) => {
                const mw = $['max-width'];
                return mw && 300 && Number(mw) >= 120;
            });

        photos.push({
            thumb: probePhoto ? probePhoto._ : max,
            hres: max,
        });
    }

    if (post['regular-body']) {
        let body = post['regular-body'];
        body = Array.isArray(body) ? body.join('') : body;
        const r = body.matchAll(/src="([^"]+)"/g);

        let n = r.next();
        while (!n.done) {
            photos.push({thumb: n.value[1], hres: n.value[1]});
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
    photos: {thumb: string; hres: string}[];
};

export default class Crawler {
    useCache: boolean;
    accCache: Record<string, number>;
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

    async getPostsRandom(account: string) {
        const result = await this._getPostsRandom(account);

        return {
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

    async _getPostsRandom(account: string) {
        try {
            const url = `https://${account}.tumblr.com/api/read?type=photo&num=${this.limit}&start=${0}`;
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
