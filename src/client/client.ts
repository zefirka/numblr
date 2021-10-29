import {html, render, TemplateResult} from 'lit-html';
import debounce from 'lodash/debounce';
import type {PostMap} from '../crawler';

import './styles.scss';
class App {
    static PAGE_SIZE = __DATA__.pageSize;
    static API_URL = __DATA__.apiUrl;
    static ACCOUNT = __DATA__.account;

    timer: void | NodeJS.Timer;
    state: {
        offset: number;
        nextCol: number;
        imgIdx: number;
        colh: [number, number, number];
        zoom: boolean;
        timerSec: number;
    };

    $overlay = Overlay;
    $end = End;
    $cols = [Col0, Col1, Col2];
    $timer = {
        $: Timer,
        toggle: Timer.querySelector('.toggle') as HTMLElement,
        plus: Timer.querySelector('.plus') as HTMLElement,
        minus: Timer.querySelector('.minus') as HTMLElement,
        secs: Timer.querySelector('.secs') as HTMLElement,
    };

    constructor() {
        this.timer = undefined;

        this.state = {
            offset: Number(window.location.hash.slice(1) || 0),
            nextCol: 1,
            imgIdx: 0,
            colh: [0, 0, 0],
            zoom: false,
            timerSec: 2000,
        };

        this.start();
    }

    start() {
        this.loadNext();

        this.$end.addEventListener('click', () => {
            this.loadNext();
        });

        window.addEventListener('scroll', this.onScroll);
        document.addEventListener('keydown', this.onKeydown);
        document.addEventListener('click', this.onClick);
        this.$overlay.querySelector('.next')?.addEventListener('click', () => {
            this.showDir(1);
        });
        this.$overlay.querySelector('.prev')?.addEventListener('click', () => {
            this.showDir(-1);
        });
        this.$timer.toggle.onclick = this.toggleTimer;
        this.$timer.plus.onclick = () => {
            this.setTimer(Math.min(100000, this.state.timerSec + 1000));
        };

        this.$timer.minus.onclick = () => {
            this.setTimer(Math.max(1000, this.state.timerSec - 1000));
        };
    }

    get minColIdx() {
        const [a, b, c] = this.state.colh;
        if (a + b + c === 0) {
            return ((Math.random() * 10) >> 0) % 3;
        }
        const minVal = Math.min(...this.state.colh);
        const result = this.state.colh.indexOf(minVal);
        if (result === -1) {
            throw new Error('Invalud case @TODO');
        }

        return result;
    }

    private onScroll = debounce(() => {
        // @TODO
        if (document.body.clientHeight - (window.scrollY + window.innerHeight) < 200) {
            this.loadNext();
        }
    }, 300);

    private onClick = (e: MouseEvent) => {
        if (!e.target) return;

        const el = e.target as HTMLElement;

        if (el.tagName === 'A') {
            return;
        }

        e.preventDefault();

        if (el.tagName === 'IMG') {
            const img = el as HTMLImageElement;

            if (e.metaKey || e.ctrlKey) {
                fetch('/download', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: img.dataset.orig || img.src,
                    }),
                })
                    .then((d) => d.json())
                    .then(() => {
                        el.classList.add('success');
                        setTimeout(() => {
                            el.classList.remove('success');
                        }, 500);
                    })
                    .catch(alert);
            } else if (e.altKey) {
                this.downloadDirect(img.dataset.orig || img.src);
            } else {
                const isZoom = el.classList.toString() == 'big';
                if (isZoom) {
                    this.select();
                } else {
                    this.select(img);
                }
                this.$overlay.style.display = this.$overlay.style.display === 'block' ? 'none' : 'block';
                if (this.$overlay.style.display === 'none') {
                    this.timer && clearInterval(this.timer);
                }
            }
        }
    };

    private downloadDirect(url: string) {
        const name = url.split('/').pop() as string;

        fetch(url, {
            method: 'GET',
        })
            .then((response) => response.blob())
            .then((response) => {
                const url = window.URL.createObjectURL(response);
                const a = document.createElement('a');
                a.href = url;
                a.download = name;
                document.body.appendChild(a);
                a.click();
                a.remove();
            });
    }

    private setTimer(secs: number) {
        this.timer && clearInterval(this.timer);
        this.state.timerSec = secs || 2000;

        if (secs) {
            this.timer = setInterval(() => this.showDir(1), this.state.timerSec);
        } else {
            this.timer = undefined;
        }

        const icon = this.$timer.toggle.querySelector('.fas');

        if (!icon) {
            return;
        }
        if (!this.timer) {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
        } else {
            icon.classList.add('fa-pause');
            icon.classList.remove('fa-play');
        }
        this.recordTimer();
    }

    private toggleTimer = () => {
        this.setTimer(this.timer ? 0 : this.state.timerSec || 2000);
    };

    private onKeydown = (e: KeyboardEvent) => {
        const curbig = document.querySelector('.big');

        if (e.key === ' ' && curbig) {
            e.preventDefault();
            this.toggleTimer();
        }

        if (e.key === 'ArrowRight' && curbig) {
            this.showDir(1);
        }

        if (e.key === 'ArrowLeft' && curbig) {
            this.showDir(-1);
        }

        if (e.key === 'ArrowUp' && curbig) {
            this.setTimer(Math.min(100000, this.state.timerSec + 1000));
        }

        if (e.key === 'ArrowDown' && curbig) {
            this.setTimer(Math.max(1000, this.state.timerSec - 1000));
        }

        if ('123450'.includes(e.key)) {
            this.timer && clearInterval(this.timer);
            this.setTimer(Number(e.key) * 1000);
        }

        if (e.key === 'Escape') {
            this.timer && clearInterval(this.timer);
            this.$overlay.style.display = 'none';
            this.select();
        }
    };

    private async showDir(dir: 1 | -1) {
        const curbig = document.querySelector('.big') as HTMLElement;
        if (!curbig) {
            return;
        }
        const nextIdx = Number(curbig.dataset?.idx) + dir;

        if (this.state.imgIdx - nextIdx < 5) {
            await this.loadNext();
        }
        const nextEl = document.querySelector(`[data-idx="${nextIdx}"]`) as HTMLImageElement;
        this.select(nextEl);
    }

    private prefetch(photos: PostMap['photos']) {
        photos.forEach(({hres}) => {
            setTimeout(() => {
                const img = new Image();
                img.src = hres;
            });
        });
    }

    private renderPost(post: PostMap, onClick: {handleEvent: (e: MouseEvent) => void}, col: number) {
        const images: TemplateResult[] = [];
        this.prefetch(post.photos);
        post.photos.forEach((url) => {
            images.push(html`
                <figure class="fig">
                    <img
                        src="${url.thumb}"
                        data-orig="${url.hres}"
                        data-col="${col} "
                        data-post="${post.idx}"
                        data-idx="${this.state.imgIdx}"
                    />
                    <div class="controls">
                        <button class="save" type="button" data-src="${url.hres}" @click=${onClick}>
                            <i class="fas fa-save fa"></i>
                        </button>
                    </div>
                </figure>
            `);
            this.state.imgIdx += 1;
        });

        return html`
            <div class="post-imgs">${images}</div>
            <div class="post-caption">
                <div class="nowrap">
                    <a href="${post.url}/"><i class="fas fa-link"></i></a>
                    &nbsp;
                    <div ?hidden=${!post.rebloggedRoot}>
                        <i class="fas fa-user"></i>&nbsp;<a href="/account/${post.rebloggedRoot}/"
                            >${post.rebloggedRoot}</a
                        >
                    </div>
                </div>
                <div class="nowrap" ?hidden=${!post.reblogged || post.rebloggedRoot === post.reblogged}>
                    <i class="fas fa-share-square"></i>&nbsp;<a href="/account/${post.reblogged}/">${post.reblogged}</a>
                </div>
            </div>
        `;
    }

    private setLoading(t: boolean) {
        this.$end.classList[t ? 'add' : 'remove']('loading');
    }

    private render(posts: PostMap[]) {
        if (!posts.length) {
            posts.push({
                url: '',
                idx: Infinity,
                photoset: [],
                photos: [{thumb: '/imgs/notfound.png', hres: '/img/notfound.png'}],
            });
        }

        posts.forEach((post) => {
            const postElem = document.createElement('div');
            postElem.classList.add('post');

            const col = this.minColIdx;
            const tpl = this.renderPost(
                post,
                {
                    handleEvent: (e: MouseEvent) => {
                        const url = (e.target as HTMLElement).dataset['src'] || '';
                        this.downloadDirect(url);
                    },
                },
                col,
            );

            render(tpl, postElem);

            this.state.colh[col] += 300;

            console.log('Appendind to ', col);
            this.$cols[col].append(postElem);
            postElem.querySelectorAll('img').forEach((img) => {
                img.onload = () => {
                    this.state.colh[col] = this.state.colh[col] - 300 + img.clientHeight;
                    img.onload = null;
                };
            });
        });
    }

    private async loadNext() {
        this.setLoading(true);
        try {
            const imgs = await fetch(
                '/items/' + App.ACCOUNT + '/' + this.state.offset + (window.location.search || ''),
            ).then((d) => d.json());
            this.render(imgs.items);
        } catch (err) {
            console.log('err', err);
            alert(err);
        } finally {
            this.setLoading(false);
        }
        this.state.offset += App.PAGE_SIZE;
        window.location.hash = String(this.state.offset);
    }

    private recordTimer() {
        this.$timer.secs.innerText = String(this.state.timerSec / 1000);
    }

    private swap(i: HTMLImageElement, dir = 1) {
        if (dir === 1) {
            i.setAttribute('data-thumb', i.src);
            i.src = i.dataset.orig || i.src;
        } else {
            i.setAttribute('data-orig', i.src);
            i.src = i.dataset.thumb || i.src;
        }
    }

    private select(el?: HTMLImageElement) {
        const curBig = document.querySelector('.big') as HTMLImageElement;

        if (curBig) {
            curBig.classList.remove('big');
            this.swap(curBig, -1);
        }

        if (el) {
            this.swap(el, 1);
            el.classList.add('big');
            this.$timer.$.style.display = 'block';
        } else {
            this.$timer.$.style.display = 'none';
        }
    }
}

export default new App();
