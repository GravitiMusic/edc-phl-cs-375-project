DROP DATABASE IF EXISTS oneup;
CREATE DATABASE oneup;
\c oneup
DROP TABLE IF EXISTS users;
CREATE TABLE users(
	id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    password VARCHAR(100)
);

