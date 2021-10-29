import axios from 'axios';
import {html, render} from 'lit-html';
import debounce from 'lodash/debounce';
import type {PostMap} from '../crawler';

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
        this.$timer.toggle.onclick = this.toggleTimer;
        this.$timer.plus.onclick = () => {
            this.setTimer(Math.min(100000, this.state.timerSec + 1000));
        };

        this.$timer.minus.onclick = () => {
            this.setTimer(Math.max(1000, this.state.timerSec - 1000));
        };
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
            if (e.metaKey || e.ctrlKey) {
                fetch(`http://localhost:8081/download`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: (el as HTMLImageElement).src,
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
                this.downloadDirect((el as HTMLImageElement).src);
            } else {
                const isZoom = el.classList.toString() == 'big';
                if (isZoom) {
                    this.select();
                } else {
                    this.select(el);
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
                var url = window.URL.createObjectURL(response);
                var a = document.createElement('a');
                a.href = url;
                a.download = name;
                document.body.appendChild(a); // we need to append the element to the dom -> otherwise it will not work in firefox
                a.click();
                a.remove(); //afterwards we remove the element again
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
        const nextEl = document.querySelector(`[data-idx="${nextIdx}"]`) as HTMLElement;
        this.select(nextEl);
    }

    private renderPost(post: PostMap, onClick: any) {
        const images: any[] = [];

        post.photos.forEach((url) => {
            images.push(html`
                <figure class="fig">
                    <img src="${url}" data-post="${post.idx}" data-idx="${this.state.imgIdx}" />
                    <button class="save" type="button" data-src="${url}" @click=${onClick}>
                        <i class="fas fa-save fa-3]x"></i>
                    </button>
                </figure>
            `);
            this.state.imgIdx += 1;
        });

        return html`
            <div class="post-imgs">${images}</div>
            <div class="post-caption">
                <div><a href="/folder/${post.reblogged}/">${post.reblogged}</a></div>
                <div><a href="/folder/${post.rebloggedRoot}/">${post.rebloggedRoot}</a></div>
            </div>
        `;
    }

    private setLoading(t: boolean) {
        this.$end.classList[t ? 'add' : 'remove']('loading');
        End.innerText = t ? 'Loading' : '';
    }

    private render(posts: PostMap[]) {
        posts.forEach((post, i) => {
            const postElem = document.createElement('div');
            postElem.classList.add('post');
            render(
                this.renderPost(post, {
                    handleEvent(e: MouseEvent) {
                        const url = (e.target as HTMLElement).dataset['src'] || '';
                        this.downloadDirect(url);
                    },
                }),
                postElem,
            );

            const col = this.state.nextCol;
            console.log('Appendind to ', col);
            this.$cols[col].append(postElem);
            this.state.nextCol = (this.state.nextCol + 1) % 3;
        });
    }

    private async loadNext() {
        this.setLoading(true);
        try {
            const imgs = await fetch(
                App.API_URL + '/items/' + App.ACCOUNT + '/' + this.state.offset + (window.location.search || ''),
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

    private select(el?: HTMLElement) {
        document.querySelector('.big')?.classList.remove('big');

        if (el) {
            el.classList.add('big');
            debugger;
            this.$timer.$.style.display = 'block';
        } else {
            this.$timer.$.style.display = 'none';
        }
    }
}

export default new App();
