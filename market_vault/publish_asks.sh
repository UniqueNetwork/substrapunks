#!/bin/bash
oldcid=0
while :
do
    cid=$(ipfs add asks.json -q)
    if [ $oldcid = $cid ]; then
        echo "Asks file did not change, will not re-publish"
        sleep 1m
    else
        echo "Asks file changed (${cid}), publishing."
        ipfs name publish --key=asks $cid
        ipfs pin rm $oldcid
        ipfs repo gc
    fi

    oldcid=$cid
done
