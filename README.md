### **APIDOC**

Inline Documentation for RESTful web APIs https://apidocjs.com

#### Install

`npm install apidoc@0.29.0 -g`

#### Used

`cd apidoc-gen`

```
apidoc -i vichat/ -o ../apidoc/ -t template
```

Website: http://localhost:8383/apidoc

### **Setup project**

#### Require

`nodejs 12.14.0` `npm 6.13.4` `nodemon 2.0.12`

#### Config

```
cp configs/config.js.example configs/config.js
```

Config will override value in global config `configs/global.js`

```
MY_API_DOMAIN
PALBOX_BOT_API
```

#### Install dependencies

```
npm install
```

#### Start the server:

```
npm start
```

View the website at: http://localhost:8383

### **Deploy**
