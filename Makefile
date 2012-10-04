test:
	@./node_modules/.bin/mocha -u tdd

build:
	@./node_modules/.bin/pegjs matematica.pegjs parser.js
	
.PHONY: test