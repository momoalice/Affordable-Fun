#!/bin/bash

cd $(dirname $0)

function showHelp
{
cat << EOF

Usage: `basename $0` <version>

  The purpose of this tool is to publish Layer Web SDK release
  Make sure you pass the <version> as the first parameter.

  example: ./publish.sh 1.0.0

EOF
}

if [ $# -ne 1 ]; then
  showHelp
  exit 1
fi

version=$1

# Initiate Grunt tasks
grunt test
grunt build
grunt docs

# Publish API reference docs to S3
aws s3 cp docs/ s3://static.layer.com/sdk/docs --recursive

# Tag a version
git tag -a $version -m "Release of version $version"
git push --tags

# NPM Publish
npm publish .

# Copy CDN files
mkdir -p ../cdn/cdn-files/sdk/$version
cp build/client.debug.js ../cdn/cdn-files/sdk/$version/layer-websdk.js
cp build/client.min.js ../cdn/cdn-files/sdk/$version/layer-websdk.min.js

echo
# echo "Please tag and deploy a new CDN version of Web SDK: $version"
echo "Add release notes: https://github.com/layerhq/layer-websdk/releases/new?tag=$version"
