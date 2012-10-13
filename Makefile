# ===== Directories =====

SRC_DIR       = src
LIB_DIR       = lib
BIN_DIR       = bin
TEST_DIR      = test
EXAMPLES_DIR  = examples
MODULES_DIR   = node_modules
DIST_DIR      = dist
UTILS_DIR     = utils

# ===== Files =====

PARSER_SRC_FILE = $(SRC_DIR)/matematica.pegjs
PARSER_OUT_FILE = $(SRC_DIR)/parser.js

SRC_FILE = $(SRC_DIR)/matematica.js
LIB_FILE = $(LIB_DIR)/matematica.js

PACKAGE_JSON_SRC_FILE  = package.json
PACKAGE_JSON_DIST_FILE = $(DIST_DIR)/package.json

CHANGELOG_FILE = CHANGELOG
LICENSE_FILE   = LICENSE
README_FILE    = README.md
VERSION_FILE   = VERSION

# ===== Executables =====

JSHINT        = $(MODULES_DIR)/jshint/bin/hint
UGLIFYJS      = uglifyjs
MOCHA         = $(MODULES_DIR)/mocha/bin/mocha
PEGJS         = $(MODULES_DIR)/pegjs/bin/pegjs
PP            = $(UTILS_DIR)/pp

# ===== Variables =====

PEGJS_VERSION = `cat $(VERSION_FILE)`

# ===== Targets =====

# Generate the grammar parser
parser:
	$(PEGJS) --export-var Matematica.parser $(PARSER_SRC_FILE) $(PARSER_OUT_FILE)

# Build the matematica.js library
build: parser
	mkdir -p $(LIB_DIR)
	$(PP) $(SRC_FILE) > $(LIB_FILE)

# Remove built matematica.js library (created by "build")
clean:
	rm -rf $(LIB_DIR)

# Prepare dstribution files
dist: build
	# Node.js
	mkdir -p $(DIST_DIR)
	cp -r               \
	  $(LIB_DIR)        \
	  $(BIN_DIR)        \
	  $(EXAMPLES_DIR)   \
	  $(CHANGELOG_FILE) \
	  $(LICENSE_FILE)   \
	  $(README_FILE)    \
	  $(VERSION_FILE)   \
	  $(DIST_DIR)
	$(PP) $(PACKAGE_JSON_SRC_FILE) > $(PACKAGE_JSON_DIST_FILE)

# Remove distribution file (created by "dist")
distclean:
	rm -rf $(DIST_DIR)

# Run the spec suite
test: build
	$(MOCHA) -R spec -u tdd 

# Run JSHint on the source
hint: build
	$(JSHINT)                                                                \
	  `find $(SRC_DIR) -name '*.js'`                                         \
	  `find $(TEST_DIR) -name '*.js'` 

.PHONY: test hint parser build clean dist distclean
.SILENT: test hint parser build clean dist distclean
