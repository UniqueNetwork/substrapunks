if [ "$1" == "noinstall" ]; then
echo "Skipping npm install";
else
sudo npm install -g browserify;
fi

node browserify_config.js
browserify nft.js > ../public/js/polkadot.js