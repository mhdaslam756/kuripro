# Local HTTPS certificate

Chrome will not run the service worker (and so cannot subscribe to push) on Vite's self-signed
fallback certificate. Create a trusted one once:

```
brew install mkcert
mkcert -install
cd frontend/certs
mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 ::1
```

Restart `npm run dev`. For a phone on the same Wi-Fi, add your LAN IP to the mkcert command
(e.g. `192.168.1.20`) and install the mkcert root CA on the phone.
