#!/usr/bin/env bash

set -e

deno run build:node

cp report/rapport.pdf ./Boudrouss-Breton-Durbin-Rapport.pdf
7z a aaga-projet1-Boudrouss-Breton-Durbin.zip dist/* src/* tests/* readmeimg/* build-node.ts cli cli.ts deno.json deno.lock main.ts README.md study.sh visualize.py zip.sh
rm ./Boudrouss-Breton-Durbin-Rapport.pdf