# API Documentation

## Authentication

- description: Sign up
- request: `POST /signup/`
  - content-type: `application/json`
  - body:
    - username: (string) the username for the new account
    - password: (string) the password for the new account
- response: 200
  - body: user 'username' signed up
- response: 400
  - body: username or password is missing
- response: 409
  - body: username 'username' already exists

```bash
$ curl -H "Content-Type: application/json"
        -X POST -d '{"username":"alice","password":"alice"}'
        -c cookie.txt
        https://localhost:3000/signup/
```

- description: Sign in
- request: `POST /signin/`
  - content-type: `application/json`
  - body:
    - username: (string) the username for the new account
    - password: (string) the password for the new account
- response: 200
  - body: user 'username' signed in
- response: 400
  - body: username or password is missing
- response: 401
  - body: Invalid username or password

```bash
$ curl -H "Content-Type: application/json"
        -X POST -d '{"username":"alice","password":"alice"}'
        -c cookie.txt
        https://localhost:3000/signin/
```

- description: Sign out
- request: `GET /signout/`
- response: 200
  - redirect to /

```bash
$ curl
    -b cookie.txt
    -c cookie.txt
    https://localhost:3000/signout/
```

## User settings

- description: Update user settings for logged in user.
- request: `POST /settings/`
  - content-type: `application/json`
  - body:
    - streamKey: (string) the stream key for Twitch
    - resolution: (string) the resolution that the user will stream in. Default is 1280x720.
- response: 200
  - body: User settings updated successfully for 'username'.
- response: 401
  - body: access denied

```bash
$ curl -X POST
       -H "Content-Type: application/json"
       -d '{"streamKey":"19fjthisistotallyarealkeyf","resolution":"1920x1080"}'
       -b cookie.txt
       https://localhost:3000/settings/
```

- description: Retrieve the settings of the authenticated user.
- request: `GET /settings/`
- response: 200
  - content-type: `application/json`
  - body:
    - streamKey: (string) the stream key for Twitch
    - resolution: (string) the resolution that the user will stream in.
- response: 401
  - body: access denied
- response: 404
  - body: User settings not found.

```bash
$ curl -b cookie.txt
       https://localhost:3000/settings/
```
