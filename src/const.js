import dotenv from "dotenv";
dotenv.config();

const PORT = 3000;
const TOKEN_DURATION = "1d";
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_HOST = process.env.DB_HOST;

const URL_DB = `mongodb://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:27017/${DB_DATABASE}?authSource=admin`

export { TOKEN_DURATION, PORT, URL_DB};