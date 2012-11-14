all:

VER:=$(shell ./VERSION-GEN)
MAJVER:=$(shell echo $(VER)|sed 's|^\([^.]\+[.][^.]\+\).*$$|\1|' )

CLIENT_ARTIFACTS=\
	websocket-multiplex-$(VER).js \
	websocket-multiplex-$(MAJVER).js

upload_client:
	echo "VER=$(VER) MAJVER=$(MAJVER)"
	cp multiplex_client.js websocket-multiplex-$(VER).js
	cp multiplex_client.js websocket-multiplex-$(MAJVER).js
	@echo -e 'Run:'
	@echo -e '\ts3cmd put --acl-public index.html $(CLIENT_ARTIFACTS) s3://sockjs'
	@echo -e '\tmake clean'

clean:
	rm $(CLIENT_ARTIFACTS)
	rm -rf examples/sockjs/node_modules
