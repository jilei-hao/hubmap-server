'use strict'

/* 
  ===============================================================
    HuBMAP Server
    v1.0
    
    
  ==============================================================
*/

import { createServer } from 'http';
import { parse } from 'url';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { exec } from 'child_process';
import path from 'path';
import process from 'process';
import fs from 'fs';

const hostname = 'localhost';
const port = 3000;
const version = 'v1.0.0'

const configFile = readFileSync('server-config.json');
const serverConfig = JSON.parse(configFile);
console.log(serverConfig);

const generator = serverConfig['generatorLocation'];
console.log('generator location = ', generator);

// Validate the query object
// -- for now we only do key existence check
function validateQuery(q) {
    if (!('ns' in q)) return false;
    if (!('nr' in q)) return false;
    if (!('d' in q)) return false;
    if (!('h' in q)) return false;
    if (!('w' in q)) return false;

    return true;
}

// Return a read stream to the input file
function composeFileStream(fn, res) {
    const stat = fs.statSync(fn);

    res.writeHead(200, {
        'Content-Type': 'model/vtp',
        'Content-Length': stat.size,
        "Content-Disposition": "attachment; filename=Ovary.vtp"
    });

    const readStream = fs.createReadStream(fn);
    readStream.pipe(res);
}


const server = createServer((req, res) => {
    const q = parse(req.url, true).query;
    //console.log(q);

    if (validateQuery(q)) {
        // if the query string is valid, start parsing and execution
        const ns = q['ns'], nr = q['nr'], d = q['d'], h = q['h'];
        let w = q['w'];

        /*
        // temporarily stripping /index.json from the query
        w = w.substring(0, w.indexOf('/'));
        console.log('stripped w: ', w);
        */

        const cwd = process.cwd();
        const outDir = path.join(cwd, 'public', 'temp_data', `mesh_${ns}_${nr}_${d}_${h}_${w}`);
        const fnMesh = path.join(outDir, 'Ovary.vtp');
        //console.log('outDir: ', outDir);

        // if directory exists, return existing file
        if (existsSync(fnMesh)) {
            console.log(`${fnMesh} already exists! Responding with file in the cache.`);

            const readStream = composeFileStream(fnMesh, res);
            return;
        }

        // if directory does not exist, create one
        if (!existsSync(outDir)) {
            mkdirSync(outDir);
        }

        // build command
        let cmd = `${generator} ${ns} ${nr} ${d} ${h} ${w} ${outDir}`;
        console.log(`cmd: ${cmd}`);
        
        // execute the command in a child process
        exec(cmd, (err, stdout, stderr) => {
            if (err) { return; }
            console.log(`stdout:\n ${stdout}`); 
            console.log(`stderr:\n ${stderr}`);

            const readStream = composeFileStream(fnMesh, res);
        });
    } else {
        console.log("Invalid Query Received!");
    }
});

server.listen(port, hostname, () => {
    console.log(`Hubmap Server ${version} running at http://${hostname}:${port}/`);
});