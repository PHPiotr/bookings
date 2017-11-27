#!/bin/bash
set -e

if [ "$TRAVIS_BRANCH" != "development" ]; then
  exit 0;
fi

git config --global user.email $TRAVIS_COMMITTER_EMAIL
git config --global user.name $TRAVIS_COMMITTER_NAME
git remote set-branches --add origin master
git fetch
git reset --hard
git checkout master --force
git merge --no-ff --no-edit development
git remote add travis-origin https://${GITHUB_TOKEN}@github.com/PHPiotr/bookings
git push --set-upstream travis-origin master