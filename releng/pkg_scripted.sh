# Crude packaging scripted
# ignores play-area and releng in packaging
# version.txt should contain the version tag
jar -cvMf scripted_v0.2.0.zip scripted/README.md scripted/bin scripted/client scripted/license.txt scripted/open_source_licenses.txt scripted/server scripted/version.txt
