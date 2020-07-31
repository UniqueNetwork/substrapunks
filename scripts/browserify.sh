if [ "$1" == "noinstall" ]; then
echo "Skipping npm install";
else
sudo npm install -g browserify;
fi

browserify nft.js > ../public/js/polkadot.js