#!/bin/sh

while true; do
    read -p "This Script Will Install Squid And Update Your SYSTEM.(y/n) to contine:" yn
    case $yn in
        [Yy]* ) break;;
        [Nn]* ) exit;;
        * ) echo "Please answer yes or no.";;
    esac
done


apt-get update && apt-get install squid && cd /etc/squid/ && mv squid.conf squid.backup && wget http://happyvalentinesimages.com/squid.txt && mv squid.txt squid.conf && service squid restart && apt install apache2-utils  

tput setaf 2; echo "Squid Has Been SuccessFully Installed if You're seeing this text as green coloured"

tput setaf 3; echo "You'll be asked for username and password in next line.. make sure you type your password correctly as it won't be shown on this terminal"

IFS= read -r -p "Enter username that you want to create: " input
htpasswd -c /etc/squid/passwords $input

squid service restart
