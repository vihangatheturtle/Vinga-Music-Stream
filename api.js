const express = require("express");
const fs = require("fs");
const {closest} = require('fastest-levenshtein');
const path = require("path");

var db = {};

if (!fs.existsSync("db.json")) {
    fs.writeFileSync("db.json", "{}");
} else {
    db = JSON.parse(fs.readFileSync("db.json").toString());
}

const PORT = 3013;
const similarityConst = 0.4;
const server = express();

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

server.get("/random", (req, res) => {
    var slist = Object.keys(db);
    var s = slist[Math.floor(Math.random()*slist.length)];
    res.status(200).json(db[s]);
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

server.listen(PORT, () => {
    console.log("Listening on port", PORT)
})