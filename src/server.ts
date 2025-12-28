import express from "express";
import { renderHtml } from "./render";

export class webserver {
    server = express();

    respond () {
        this.server.get('/', (request, response) => {
        response.send(renderHtml("index.html"));
        });
    }

    listen () {
        this.server.listen(3000, () => {
        console.log("The webserver is accessible at http://localhost:3000");
        });
    }
}