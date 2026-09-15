import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const website = fileURLToPath(new URL('../../', import.meta.url));
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2', '.txt':'text/plain' };
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    const mirror=url.pathname.startsWith('/a702/');
    const root=path.resolve(website,mirror?'a702/dist':'dist');
    const relative=decodeURIComponent(mirror?url.pathname.slice(5):url.pathname);
    let file=path.resolve(root,'.'+relative);
    if(file!==root&&!file.startsWith(root+path.sep))throw new Error('Invalid path');
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    const body=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(5199,'127.0.0.1',()=>console.log('Civiquill production builds: http://127.0.0.1:5199/ and /a702/'));
