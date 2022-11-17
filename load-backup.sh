echo "Loading backup..."
rm db.json
rm -r audio
rm -r images
cp ~/vinga-music-stream.bak/db.json db.json
cp -r ~/vinga-music-stream.bak/audio audio
cp -r ~/vinga-music-stream.bak/images images
echo "Loaded backup!"