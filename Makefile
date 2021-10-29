VERSION=$(shell echo "console.log(require('./package.json').version)" | node -)

.PHONY: build push

run:
	npm run build:server:watch & build:server:watch & npm run dev

build:
	docker build -t "numblr:$(VERSION)" -t number:latest .

push:
	docker push "numblr:$(VERSION)"
	docker push numblr:latest
