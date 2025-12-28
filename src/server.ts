import express from "express";

export class webserver {
    server = express();

    respond () {
        this.server.get('/', (request, response) => {
        response.send("Hi!");
        });
    }

    listen () {
        this.server.listen(3000, () => {
        console.log("http://localhost:3000");
        });
    }
}