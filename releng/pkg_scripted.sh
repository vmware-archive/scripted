# Crude packaging scripted
# ignores play-area and releng in packaging
# version.txt should contain the version tag
jar -cvMf scripted_v0.3.0.zip scripted/README.md scripted/bin scripted/client scripted/completions scripted/license.txt scripted/node_modules scripted/open_source_licenses.txt scripted/package.json scripted/server scripted/version.txt scripted/.scripted
