#!/bin/sh

node "./node_modules/@cicctencent/tars-deploy/bin/tars-deploy" "$PKG_DEPLOY_NAME"

echo ”查看包大小“
ls -lh "$PKG_DEPLOY_NAME.tgz"


