VERSION=$(shell echo "console.log(require('./package.json').version)" | node -)

.PHONY: build push

run:
	npm run build:server:watch & build:server:watch & npm run dev

build:
	docker build -t "zefirka/numblr:$(VERSION)" -t "zefirka/numblr:latest" .

push:
	docker push "zefirka/numblr:$(VERSION)"
	docker push "zefirka/numblr:latest"
