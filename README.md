# node-rtorrent

rtorrent wrapper script written in node.js

## Install

```sh
npm install rtorrent
```

## How to Use

```coffee
rTorrent = require 'rtorrent'
rt = new rTorrent
  host: 'localhost'  # default 'localhost'
  port: 9091         # default 9091
  username: 'hoge'   # default blank
  password: 'fuga'   # default blank
  path: '/RPC1'   # default /RPC1
```
