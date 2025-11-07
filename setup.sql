DROP DATABASE IF EXISTS oneup;
CREATE DATABASE oneup;
\c oneup

-- Session table for storing user login sessions
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR NOT NULL,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (sid)
);

DROP TABLE IF EXISTS users;
CREATE TABLE users(
	id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    password VARCHAR(100)
);

