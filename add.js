const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const readline = require('readline');
const inquirer = require('inquirer');
const http = require('https');                                  
const Stream = require('stream').Transform;
const { 
    v4: uuidv4,
} = require('uuid');

var audioDB = {};

if (fs.existsSync("db.json")) {
    audioDB = JSON.parse(fs.readFileSync("db.json"));
} else {
    fs.writeFileSync("db.json", "{}")
}

if (!fs.existsSync("cdn")) {
    fs.mkdirSync("cdn")
}

async function dlArtwork(url, id) {
    if (!fs.existsSync("images")) {
        fs.mkdirSync("images")
    }
    var filename = `images/${id}.jpeg`;
    http.request(url, function(response) {                                        
        var data = new Stream();                                                    
      
        response.on('data', function(chunk) {                                       
          data.push(chunk);                                                         
        });                                                                         
      
        response.on('end', function() {                                             
          fs.writeFileSync(filename, data.read());                               
        });                                                                         
    }).end();
}

async function getVideo(videoID, name, art, cb, progresscb = null) {
    if (videoID.includes("?")) {
        videoID = videoID.split("?")[1]
    }
    try { videoID = videoID.split("v=")[1].split("&")[0] } catch { }
    console.log("Downloading from YouTube:", videoID);
    if (!fs.existsSync("audio")) {
        fs.mkdirSync("audio")
    }
    if (progresscb) progresscb("Fetching audio information from YouTube");
    let info = await ytdl.getInfo(videoID);
    var basicInfo = (await ytdl.getBasicInfo(videoID)).videoDetails;
    let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    var highestQuality = null;
    for (let i = 0; i < audioFormats.length; i++) {
        const a = audioFormats[i];
        if (a.audioBitrate > highestQuality || highestQuality === null) {
            highestQuality = a
        }
    }
    if (progresscb) progresscb("Downloading audio as mp3");
    const audio = ytdl(videoID, { filter: format => format.itag === highestQuality.itag })
    const aid = uuidv4();
    const tid = uuidv4();
    const dbEntry = {
        id: tid.split("-")[tid.split("-").length-1],
        name: name,
        length: basicInfo.lengthSeconds,
        art: aid.split("-")[tid.split("-").length-1],
        bitrate: highestQuality.audioBitrate
    }
    let start = Date.now();
    ffmpeg(audio)
    .audioBitrate(highestQuality.audioBitrate)
    .save(`audio/${dbEntry.id}.mp3`)
    .on('progress', p => {
        if (progresscb) progresscb(`${p.targetSize}kb downloaded`);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`${p.targetSize}kb downloaded`);
    })
    .on('end', async () => {
        await dlArtwork(art, dbEntry.art)
        console.log(`\nDownload complete, took ${(Date.now() - start) / 1000}s`);
        if (progresscb) progresscb(`"${dbEntry.name}" added to db`);
        audioDB[dbEntry.id] = dbEntry
        cb();
    });
}

function addSong() {
    inquirer
    .prompt([
        {name: "YouTube Link"},
        {name: "Song Name"},
        {name: "Album Art Link"}
    ])
    .then(async a => {
        getVideo(a["YouTube Link"], a["Song Name"], a["Album Art Link"], () => {
            addSong(); 
        });
    })
    .catch((error) => {
        if (error.isTtyError) {
            console.log("Failed to load questions, error: render failed (TTY ERROR)")
        } else {
            console.log("Failed to load questions, error:", error)
        }
    });
}

setInterval(() => {
    try {
        var existing = JSON.stringify(JSON.parse(fs.readFileSync("db.json")));
        var current = JSON.stringify(audioDB);

        if (existing !== current) {
            fs.writeFileSync("db.json", JSON.stringify(audioDB, null, 4));
        }
    } catch {
        fs.writeFileSync("db.json", JSON.stringify(audioDB, null, 4));
    }
}, 500);

// Uncomment this to manually add songs
// addSong();

module.exports = {
    addSong: getVideo
}