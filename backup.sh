echo "Getting ready..."
rm -r ~/vinga-music-stream.bak
mkdir ~/vinga-music-stream.bak
echo "Backing up database"
cp db.json ~/vinga-music-stream.bak/db.json
echo "Backing up audio"
cp -r audio ~/vinga-music-stream.bak/audio
echo "Backing up images"
cp -r images ~/vinga-music-stream.bak/images
echo "Backing up CDN"
cp -r cdn ~/vinga-music-stream.bak/cdn
echo "Backup complete! Saved to ~/vinga-music-stream.bak/"