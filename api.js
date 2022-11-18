const express = require("express");
const fs = require("fs");
const {closest} = require('fastest-levenshtein');
const path = require("path");
const bodyParser = require("body-parser");
const {addSong} = require("./add");
const { 
    v4: uuidv4,
} = require('uuid');

var db = {};

if (!fs.existsSync("db.json")) {
    fs.writeFileSync("db.json", "{}");
} else {
    db = JSON.parse(fs.readFileSync("db.json").toString());
}

const PORT = 80;
const similarityConst = 0.4;
const server = express();
const adminPin = "vingaispog";

server.use(bodyParser.json());

var adminSessionTokens = [];
var dls = {};

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
  
    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue),
                        costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

function similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function queryLocalDB(query) {
    query = query.toLowerCase();
    var matches = {};
    for (let i = 0; i < Object.keys(db).length; i++) {
        const key = Object.keys(db)[i];
        const title = db[key].name.toLowerCase();
        var d = similarity(title, query);
        if (d > similarityConst) {
            matches[title] = db[key];
            continue;
        }
        try {
            if (title.includes(" - ")) {
                var name = title.split(" - ")[1];
                var d = similarity(name, query);
                if (!Object.keys(matches).includes(title) && d > similarityConst) {
                    matches[title] = db[key];
                    continue;
                }
            }
        } catch { }
        try {
            if (title.includes(" - ")) {
                var name = title.split(" - ")[0];
                var d = similarity(name, query);
                if (!Object.keys(matches).includes(title) && d > similarityConst) {
                    matches[title] = db[key];
                    continue;
                }
            }
        } catch { }
        try {
            if (title.includes(" ft. ")) {
                var name = title.split(" ft. ")[0];
                var d = similarity(name, query);
                if (!Object.keys(matches).includes(title) && d > similarityConst) {
                    matches[title] = db[key];
                    continue;
                }
            }
        } catch { }
        try {
            if (title.includes(" ft. ")) {
                var name = title.split(" ft. ")[1];
                var d = similarity(name, query);
                if (!Object.keys(matches).includes(title) && d > similarityConst) {
                    matches[title] = db[key];
                    continue;
                }
            }
        } catch { }
        try {
            if (title.includes(" ft. ") && title.includes(" - ")) {
                var name = title.split(" ft. ")[0].split(" - ")[1];
                console.log(name)
                var d = similarity(name, query);
                if (!Object.keys(matches).includes(title) && d > similarityConst) {
                    matches[title] = db[key];
                    continue;
                }
            }
        } catch { }
        try {
            if (Object.keys(db[key]).includes("tags")) {
                var obj = db[key].tags;
                for (let a = 0; a < obj.length; a++) {
                    var d = similarity(obj[a], query);
                    if (!Object.keys(matches).includes(title) && d > similarityConst) {
                        matches[title] = db[key];
                        continue;
                    }
                }
            }
        } catch { }
    }
    var results = [];
    var c = closest(query, Object.keys(matches))
    results.push(matches[c])
    for (let i = 0; i < Object.keys(matches).length; i++) {
        const m = Object.keys(matches)[i];
        if (m != c) {
            results.push(matches[m]);
        }
    }
    return results;
}

server.get("/ui", (req, res) => {
    res.status(200).send(fs.readFileSync("ui.html").toString())
});

server.post("/getsongs", (req, res) => {
    const songIds = req.body.songs;
    var responseList = [];
    for (let i = 0; i < songIds.length; i++) {
        for (let ii = 0; ii < Object.keys(db).length; ii++) {
            const song = db[Object.keys(db)[ii]];
            if (song.id === songIds[i]) {
                responseList.push(song);
            }
        }
    }
    res.status(200).json(responseList);
});

server.get("/random", (req, res) => {
    var slist = Object.keys(db);
    var s = slist[Math.floor(Math.random()*slist.length)];
    res.status(200).json(db[s]);
});

server.get("/cdn/:name", (req, res) => {
    res.status(200).sendFile(path.resolve("cdn/"+req.params.name));
});

server.get("/audio/:id", (req, res) => {
    res.status(200).sendFile(path.resolve("audio/"+req.params.id+".mp3"));
});

server.get("/art/:id", (req, res) => {
    res.status(200).sendFile(path.resolve("images/"+req.params.id+".jpeg"));
});

server.get("/search/:query", (req, res) => {
    var results = queryLocalDB(req.params.query);
    res.status(200).json(results);
});

server.get("/admin/auth/:pwd", (req, res) => {
    const pwd = req.params.pwd;

    if (pwd != adminPin) {
        return res.status(401).json({
            error: true,
            message: "Invalid admin password"
        });
    }

    var token = uuidv4();

    adminSessionTokens.push(token);

    res.status(200).json({
        error: false,
        token: token
    });
})

server.get("/admin/add/:pwd", (req, res) => {
    const pwd = req.params.pwd;

    if (pwd != adminPin) {
        return res.status(401).redirect("/ui");
    }

    res.status(200).send(fs.readFileSync("add.html").toString());
})

server.get("/admin/dlstate/:pwd/:dlid", (req, res) => {
    const pwd = req.params.pwd;
    const dlid = req.params.dlid;

    if (!adminSessionTokens.includes(pwd)) {
        return res.status(401).json({
            error: true,
            message: "Invalid admin token"
        })
    }

    if (dls[dlid] !== undefined) {
        var error = dls[dlid].includes("failed");
        return res.status(200).json({
            error: error,
            state: dls[dlid]
        })
    } else {
        return res.status(200).json({
            error: error,
            state: "Download not found"
        })
    }
})

server.post("/admin/add/:pwd", (req, res) => {
    const pwd = req.params.pwd;
    const b = req.body;

    if (!adminSessionTokens.includes(pwd)) {
        return res.status(401).json({
            error: true,
            message: "Invalid admin token"
        })
    }

    if (b.title !== "" && b.title !== undefined && b.link !== "" && b.link !== undefined && b.art !== "" && b.art !== undefined) {
        var dlid = uuidv4();
        dls[dlid] = "Waiting for download to start";
        res.status(200).json({
            error: false,
            dlid: dlid
        })
        // getVideo(videoID: any, name: any, art: any, cb: any, progresscb?: null)
        addSong(b.link, b.title, b.art, () => {}, (d) => {
            dls[dlid] = d;
        })
    } else {
        return res.status(400).json({
            error: true,
            message: "Invalid song data"
        })
    }
})

server.listen(PORT, () => {
    console.log("Listening on port", PORT)
})