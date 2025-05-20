Pre-requisites:

* Install `curl-impersonate`
  * Download latest release from their repo

    ```bash
    wget https://github.com/lwthiker/curl-impersonate/releases/download/v0.6.1/curl-impersonate-v0.6.1.x86_64-linux-gnu.tar.gz
     mkdir curl && tar xzf curl-impersonate-v0.6.1.x86_64-linux-gnu.tar.gz -C curl
     rm -rf ./curl*
     ```

Steps:

* Clone the repo and checkout to branch main_GS_42
  `git clone https://github.com/cinatic/stocks-extension.git`

* Navigate to the repo : `cd stocks-extension`

* Run `make install` to build `gschemas.compiled`

* Apply the patch of the last commit that defines `fetchImpersonate` function that uses `curl_chrome116` in our case, and use fetchImpersonate rather than fech in `yahooService.js`

* Remove the old extension if needed: 
  `rm -rf ~/.local/share/gnome-shell/extensions/stocks@infinicode.de`

* Copy the new extension:
  `cp -r stocks@infinicode.de ~/.local/share/gnome-shell/extensions`

* Log out and log back in

* Alt+F2, enter 'r', press Enter. to soft restart gnome shell to reload the extensions