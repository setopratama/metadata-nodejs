#!/usr/bin/env node
// imgmeta - ubah metadata foto & rename file (tanpa dependensi)
import { run } from "./src/cli.js";

run(process.argv.slice(2));
