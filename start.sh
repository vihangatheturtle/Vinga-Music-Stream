echo "Installing modules"
npm i
echo "Loading data from backup"
sudo chmod +x *.sh
./load-backup.sh
echo "Starting API"
sudo node api